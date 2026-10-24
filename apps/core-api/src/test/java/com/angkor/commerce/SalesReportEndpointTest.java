package com.angkor.commerce;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The parts of the contract that live above the service: who may ask, who may see phone numbers,
 * what a lowercase period binds to, and that a nonsense one is the caller's fault not the server's.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
class SalesReportEndpointTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void theUrlFormOfAPeriodIsTheOneTheApiItselfEmits() throws Exception {
        mockMvc
            .perform(get("/api/v1/reports/invoices").param("period", "last_3_months"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reportType").value("invoices"))
            .andExpect(jsonPath("$.basis").value("cash"))
            .andExpect(jsonPath("$.currency").value("USD"));
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void salesByCategoryShipsTheColumnsThatDriveTheTableAndTheTemplate() throws Exception {
        mockMvc
            .perform(get("/api/v1/reports/sales-by-category"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.columns[0].key").value("category"))
            .andExpect(jsonPath("$.columns[0].align").value("LEFT"))
            .andExpect(jsonPath("$.columns[4].format").value("PERCENT"));
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void aShopAdminNeverReceivesCustomerPhoneNumbers() throws Exception {
        mockMvc
            .perform(get("/api/v1/reports/invoices"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.columns[?(@.key == 'customerPhone')]").isEmpty());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void aSuperAdminDoes() throws Exception {
        mockMvc
            .perform(get("/api/v1/reports/invoices"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.columns[?(@.key == 'customerPhone')]").isNotEmpty());
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void anUnknownPeriodIsTheCallersFault() throws Exception {
        mockMvc.perform(get("/api/v1/reports/invoices").param("period", "banana")).andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "SHOP_ADMIN")
    void currencyMustBeAnIsoCode() throws Exception {
        mockMvc.perform(get("/api/v1/reports/invoices").param("currency", "usd")).andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void reportsAreTheWholeShopsNumbers_soCustomersAreRefused() throws Exception {
        mockMvc.perform(get("/api/v1/reports/invoices")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/reports/sales-by-category")).andExpect(status().isForbidden());
    }
}
