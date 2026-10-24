package com.angkor.commerce;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

/** Runs through the real cookie session, since the endpoint reads an AuthenticatedCustomer principal. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
class CustomerChangePasswordTest {

    private static final String BASE = "/api/v1/storefront/auth";
    // Test fixtures, not credentials: each test registers its own throwaway customer.
    private static final String OLD_PASSWORD = "Old-pass1";
    private static final String NEW_PASSWORD = "New-pass2";

    @Autowired
    MockMvc mockMvc;

    private String email;
    private Cookie[] session;

    @BeforeEach
    void registerCustomer() throws Exception {
        email = "pw-" + UUID.randomUUID() + "@example.com";
        session = mockMvc
            .perform(
                post(BASE + "/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"firstName":"Test","lastName":"Customer","email":"%s","password":"%s"}
                        """.formatted(email, OLD_PASSWORD)
                    )
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookies();
    }

    @Test
    void theNewPasswordWorksAndTheOldOneDoesNot() throws Exception {
        mockMvc
            .perform(changePassword(OLD_PASSWORD, NEW_PASSWORD))
            .andExpect(status().isNoContent())
            // This browser is signed out too: both cookies are expired on the response.
            .andExpect(cookie().maxAge("accessToken", 0))
            .andExpect(cookie().maxAge("refreshToken", 0));

        mockMvc.perform(login(OLD_PASSWORD)).andExpect(status().isUnauthorized());
        mockMvc.perform(login(NEW_PASSWORD)).andExpect(status().isOk());
    }

    @Test
    void everySessionIsSignedOut() throws Exception {
        Cookie oldRefresh = findCookie("refreshToken");

        mockMvc.perform(changePassword(OLD_PASSWORD, NEW_PASSWORD)).andExpect(status().isNoContent());

        mockMvc.perform(post(BASE + "/refresh").cookie(oldRefresh)).andExpect(status().isUnauthorized());
    }

    @Test
    void aWrongCurrentPasswordIsAFieldErrorNotA401() throws Exception {
        mockMvc
            .perform(changePassword("Wrong-pass9", NEW_PASSWORD))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.currentPassword").exists());
    }

    @Test
    void reusingTheCurrentPasswordIsRejected() throws Exception {
        mockMvc
            .perform(changePassword(OLD_PASSWORD, OLD_PASSWORD))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.newPassword").exists());
    }

    @Test
    void aWeakNewPasswordIsRejected() throws Exception {
        mockMvc.perform(changePassword(OLD_PASSWORD, "weak")).andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.RequestBuilder changePassword(String current, String next) {
        return put(BASE + "/me/password")
            .cookie(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"currentPassword":"%s","newPassword":"%s"}
                """.formatted(current, next));
    }

    private org.springframework.test.web.servlet.RequestBuilder login(String password) {
        return post(BASE + "/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email":"%s","password":"%s"}
                """.formatted(email, password));
    }

    private Cookie findCookie(String name) {
        for (Cookie cookie : session) {
            if (cookie.getName().equals(name)) return cookie;
        }
        throw new AssertionError("No " + name + " cookie on the register response");
    }
}
