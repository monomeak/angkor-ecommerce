package com.angkor.commerce;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

/**
 * Staff use every back-office screen except Team, so the API has to let them through
 * wherever the sidebar does — and nowhere it doesn't.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
@WithMockUser(roles = "STAFF")
class StaffAccessTest {

    @Autowired
    MockMvc mockMvc;

    /** Anything but a 403: the request got past security, whatever the handler made of it. */
    private static final ResultMatcher NOT_FORBIDDEN = result -> {
        if (result.getResponse().getStatus() == 403) {
            throw new AssertionError("Expected staff to be allowed, got 403 for " + result.getRequest().getRequestURI());
        }
    };

    @Test
    void staffCanOpenTheOverview() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/overview")).andExpect(status().isOk());
    }

    @Test
    void staffCanRunReports() throws Exception {
        mockMvc.perform(get("/api/v1/reports/invoices")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reports/sales-by-category")).andExpect(status().isOk());
    }

    @Test
    void staffCanBrowseInvoicesCustomersAndOrders() throws Exception {
        mockMvc.perform(get("/api/v1/invoices")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/customers")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/orders")).andExpect(status().isOk());
    }

    @Test
    void staffCanWriteToTheCatalogue() throws Exception {
        // An empty body fails validation (400) — which is only reachable once security says yes.
        mockMvc.perform(post("/api/v1/products").contentType("application/json").content("{}")).andExpect(NOT_FORBIDDEN);
        mockMvc.perform(post("/api/v1/categories").contentType("application/json").content("{}")).andExpect(NOT_FORBIDDEN);
    }

    @Test
    void teamManagementStaysAdminOnly() throws Exception {
        mockMvc.perform(get("/api/v1/users")).andExpect(status().isForbidden());
    }

    @Test
    void voidingAPaymentStaysAdminOnly() throws Exception {
        // A valid body: @Valid runs before @PreAuthorize, so "{}" would 400 and prove nothing.
        mockMvc
            .perform(post("/api/v1/payment/1/void").contentType("application/json").content("{\"reason\":\"test\"}"))
            .andExpect(status().isForbidden());
    }
}
