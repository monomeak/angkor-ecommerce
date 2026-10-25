package com.angkor.commerce;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
class TestimonialFlowTest {

    private static final String PUBLIC = "/api/v1/storefront/testimonials";
    private static final String MINE = "/api/v1/storefront/my-testimonial";
    private static final String BACK_OFFICE = "/api/v1/testimonials";

    @Autowired
    MockMvc mockMvc;

    private Cookie[] session;

    @BeforeEach
    void registerCustomer() throws Exception {
        session = mockMvc
            .perform(
                post("/api/v1/storefront/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"firstName":"Sokha","lastName":"Pich","email":"t-%s@example.com","password":"Test-pass1"}
                        """.formatted(UUID.randomUUID())
                    )
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookies();
    }

    @Test
    void onlyAnApprovedTestimonialIsPublic() throws Exception {
        long id = submit(5, "Fast delivery and the krama is lovely.");
        mockMvc.perform(get(PUBLIC)).andExpect(jsonPath(withId(id), empty()));

        mockMvc.perform(review(id, "approved")).andExpect(status().isOk());
        mockMvc
            .perform(get(PUBLIC))
            .andExpect(status().isOk())
            .andExpect(jsonPath(withId(id), hasSize(1)))
            .andExpect(jsonPath(withId(id) + ".authorName").value("Sokha P."))
            .andExpect(jsonPath(withId(id) + ".status").doesNotExist());
    }

    @Test
    void editingSendsItBackForReviewWithoutAddingASecondOne() throws Exception {
        long id = submit(4, "Good quality, a little slow to arrive.");
        mockMvc.perform(review(id, "approved")).andExpect(status().isOk());

        long editedId = submit(2, "Changed my mind, the sizing ran small.");

        assertThat(editedId).isEqualTo(id);
        mockMvc
            .perform(get(MINE).cookie(session))
            .andExpect(jsonPath("$.status").value("pending"))
            .andExpect(jsonPath("$.reviewedAt").doesNotExist())
            .andExpect(jsonPath("$.rating").value(2));
        mockMvc.perform(get(PUBLIC)).andExpect(jsonPath(withId(id), empty()));
    }

    @Test
    void noTestimonialYetIsA404() throws Exception {
        mockMvc.perform(get(MINE).cookie(session)).andExpect(status().isNotFound());
    }

    @Test
    void anOutOfRangeRatingIsAFieldError() throws Exception {
        mockMvc
            .perform(save(6, "Six stars would be nice."))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.rating").exists());
    }

    @Test
    void anyoneCanReadButOnlyCustomersCanWrite() throws Exception {
        mockMvc.perform(get(PUBLIC)).andExpect(status().isOk());
        mockMvc
            .perform(put(MINE).contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5,\"message\":\"anonymous!!\"}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get(BACK_OFFICE).cookie(session)).andExpect(status().isForbidden());
    }

    @Test
    void staffCannotMoveATestimonialBackToPending() throws Exception {
        long id = submit(5, "Lovely sampot, great fit.");
        mockMvc.perform(review(id, "pending")).andExpect(status().isBadRequest());
    }

    private long submit(int rating, String message) throws Exception {
        String body = mockMvc
            .perform(save(rating, message))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("pending"))
            .andReturn()
            .getResponse()
            .getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private RequestBuilder save(int rating, String message) {
        return put(MINE)
            .cookie(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"rating\":%d,\"message\":\"%s\"}".formatted(rating, message));
    }

    private RequestBuilder review(long id, String status) {
        return patch(BACK_OFFICE + "/" + id + "/status")
            .with(user("staff").roles("STAFF"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"%s\"}".formatted(status));
    }

    private static String withId(long id) {
        return "$.testimonials[?(@.id == %d)]".formatted(id);
    }
}
