package com.angkor.commerce;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Each test gets its own leaf category, so the numbers are exact whatever else the database
 * holds (the demo seed included). Threshold is 10 throughout.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
@WithMockUser(roles = "STAFF")
class InventoryEndpointTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcClient jdbc;

    private long categoryId;
    private long soldOutSize;
    private long runningLow;
    private long wellStocked;

    @BeforeEach
    void seedCategory() {
        String slug = "inv-" + UUID.randomUUID();
        categoryId = jdbc
            .sql("INSERT INTO categories (name, slug) VALUES ('Inventory test', :slug) RETURNING id")
            .param("slug", slug)
            .query(Long.class)
            .single();

        soldOutSize = product("Sold-out XL", 0, 40); // plenty of M, none of XL
        runningLow = product("Running low", 4, 6);
        wellStocked = product("Well stocked", 50, 60);
        long archived = product("Archived", 0, 0);
        jdbc.sql("UPDATE products SET status = 'DELETED' WHERE id = :id").param("id", archived).update();
    }

    @Test
    void summaryCountsVariantsNotJustTotals() throws Exception {
        String row = "$.categories[?(@.categoryId == %d)]".formatted(categoryId);

        mockMvc
            .perform(get("/api/v1/inventory/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.threshold").value(10))
            .andExpect(jsonPath(row + ".products").value(3)) // the archived one is left out
            .andExpect(jsonPath(row + ".variants").value(6))
            .andExpect(jsonPath(row + ".unitsInStock").value(160))
            .andExpect(jsonPath(row + ".lowStockVariants").value(2)) // 4 and 6
            .andExpect(jsonPath(row + ".outOfStockVariants").value(1)) // the XL
            .andExpect(jsonPath(row + ".productsNeedingAttention").value(2));
    }

    @Test
    void lowIncludesSoldOutAndListsTheNeediestFirst() throws Exception {
        mockMvc
            .perform(get("/api/v1/inventory/items").param("categoryId", "" + categoryId).param("stock", "low"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.inventory[0].productId").value(soldOutSize))
            .andExpect(jsonPath("$.inventory[1].productId").value(runningLow))
            .andExpect(jsonPath("$.inventory[0].variants", hasSize(2)))
            .andExpect(jsonPath("$.inventory[0].totalStock").value(40));
    }

    @Test
    void outOnlyListsProductsWithASoldOutVariant() throws Exception {
        mockMvc
            .perform(get("/api/v1/inventory/items").param("categoryId", "" + categoryId).param("stock", "OUT"))
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.inventory[0].productId").value(soldOutSize));
    }

    @Test
    void searchMatchesNameOrSku() throws Exception {
        mockMvc
            .perform(get("/api/v1/inventory/items").param("categoryId", "" + categoryId).param("search", "well"))
            .andExpect(jsonPath("$.inventory", hasSize(1)))
            .andExpect(jsonPath("$.inventory[0].productId").value(wellStocked));

        mockMvc
            .perform(get("/api/v1/inventory/items").param("categoryId", "" + categoryId).param("search", "100%"))
            .andExpect(jsonPath("$.inventory", empty()));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customersCannotSeeInventory() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/summary")).andExpect(status().isForbidden());
    }

    /** Two variants, M and XL, with the given stock. */
    private long product(String name, int stockM, int stockXl) {
        long id = jdbc
            .sql("INSERT INTO products (name, category_id, price, currency) VALUES (:name, :category, 10, 'USD') RETURNING id")
            .param("name", name)
            .param("category", categoryId)
            .query(Long.class)
            .single();

        String prefix = "INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        for (Object[] variant : new Object[][] { { "M", stockM }, { "XL", stockXl } }) {
            jdbc
                .sql("INSERT INTO product_variants (product_id, size, sku, stock) VALUES (:id, :size, :sku, :stock)")
                .param("id", id)
                .param("size", variant[0])
                .param("sku", prefix + "-" + variant[0])
                .param("stock", variant[1])
                .update();
        }
        return id;
    }
}
