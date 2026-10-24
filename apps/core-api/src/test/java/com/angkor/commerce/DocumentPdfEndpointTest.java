package com.angkor.commerce;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angkor.commerce.common.exception.PdfGenerationException;
import com.angkor.commerce.common.jsreport.JsReportRenderer;
import com.angkor.commerce.report.dto.response.ReportResponse;
import com.angkor.commerce.security.JwtAuthenticationFilter.AuthenticatedCustomer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who may download which PDF, and what a failed render looks like. jsreport is mocked, so CI
 * needs no renderer — what reaches it is asserted instead.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
@Transactional // rolls back, so the empty-database expectations of the report tests survive
class DocumentPdfEndpointTest {

    private static final byte[] PDF = "%PDF-1.7 fake".getBytes();

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcClient jdbc;

    @MockitoBean
    JsReportRenderer renderer;

    Long ownerId;
    Long strangerId;
    Long invoiceId;

    @BeforeEach
    void seed() {
        ownerId = customer("owner@example.test");
        strangerId = customer("stranger@example.test");
        invoiceId = jdbc
            .sql(
                """
                INSERT INTO invoices (invoice_number, customer_id, invoice_status, issue_date, due_date, paid_at,
                                      subtotal, total, paid_amount, balance, currency, total_items, total_quantity)
                VALUES ('INV-TEST-000001', :customerId, 'PAID', CURRENT_DATE, CURRENT_DATE, now(),
                        10, 10, 10, 0, 'USD', 0, 0)
                RETURNING id
                """
            )
            .param("customerId", ownerId)
            .query(Long.class)
            .single();
        when(renderer.render(anyString(), any())).thenReturn(PDF);
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void staffDownloadAnInvoiceNamedForItsNumber() throws Exception {
        mockMvc
            .perform(get("/api/v1/invoices/{id}/pdf", invoiceId))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andExpect(header().string("Content-Disposition", "attachment; filename=\"INV-TEST-000001.pdf\""))
            .andExpect(content().bytes(PDF));
        verify(renderer).render(eq("document"), any());
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void aMissingInvoiceIsA404AndNeverReachesTheRenderer() throws Exception {
        mockMvc.perform(get("/api/v1/invoices/{id}/pdf", Long.MAX_VALUE)).andExpect(status().isNotFound());
        verify(renderer, never()).render(anyString(), any());
    }

    @Test
    void theOwnerDownloadsTheirOwnInvoice() throws Exception {
        mockMvc
            .perform(get("/api/v1/storefront/invoices/{id}/pdf", invoiceId).with(asCustomer(ownerId)))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    void anotherCustomersInvoiceIsA404NotTheirPdf() throws Exception {
        mockMvc
            .perform(get("/api/v1/storefront/invoices/{id}/pdf", invoiceId).with(asCustomer(strangerId)))
            .andExpect(status().isNotFound());
        verify(renderer, never()).render(anyString(), any());
    }

    @Test
    void aCustomerCannotReachTheStaffRoute() throws Exception {
        mockMvc
            .perform(get("/api/v1/invoices/{id}/pdf", invoiceId).with(asCustomer(ownerId)))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void aReportPdfRendersTheSamePayloadTheScreenGets() throws Exception {
        mockMvc
            .perform(get("/api/v1/reports/sales-by-category/pdf").param("currency", "KHR"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.matchesPattern(
                "attachment; filename=\"sales-by-category-\\d{4}-\\d{2}-\\d{2}_\\d{4}-\\d{2}-\\d{2}-KHR\\.pdf\""
            )));
        verify(renderer).render(eq("report"), any(ReportResponse.class));
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void aFailedRenderIsA503NotA500() throws Exception {
        when(renderer.render(anyString(), any())).thenThrow(new PdfGenerationException("The document service is unavailable"));

        mockMvc
            .perform(get("/api/v1/invoices/{id}/pdf", invoiceId))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.status").value(503))
            .andExpect(jsonPath("$.message").value("The document service is unavailable"));
    }

    private Long customer(String email) {
        return jdbc
            .sql(
                """
                INSERT INTO customers (first_name, last_name, email, password_hash)
                VALUES ('Test', 'Customer', :email, 'x')
                RETURNING id
                """
            )
            .param("email", email)
            .query(Long.class)
            .single();
    }

    /** The principal JwtAuthenticationFilter builds from a customer token. */
    private static RequestPostProcessor asCustomer(Long customerId) {
        return authentication(
            new UsernamePasswordAuthenticationToken(
                new AuthenticatedCustomer(customerId, "customer@example.test"),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
            )
        );
    }
}
