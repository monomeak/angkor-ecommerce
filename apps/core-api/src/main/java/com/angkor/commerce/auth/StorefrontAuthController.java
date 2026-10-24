package com.angkor.commerce.auth;

import com.angkor.commerce.auth.dto.request.ChangePasswordRequest;
import com.angkor.commerce.auth.dto.request.CustomerLoginRequest;
import com.angkor.commerce.auth.dto.request.RegisterCustomerRequest;
import com.angkor.commerce.auth.dto.request.UpdateCustomerProfileRequest;
import com.angkor.commerce.auth.dto.response.AuthenticatedCustomerResponse;
import com.angkor.commerce.auth.dto.response.CurrentCustomerResponse;
import com.angkor.commerce.auth.dto.response.CustomerLoginResultResponse;
import com.angkor.commerce.auth.shared.AuthCookieService;
import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.security.JwtAuthenticationFilter.AuthenticatedCustomer;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Mirrors {@link AuthController}'s shape (register/login/refresh/logout/me, same cookie
 * pattern) but stays a fully separate controller/service/token table, per
 * CORE_API_DATA_MODEL.md decision 7 — customer auth is a structurally separate identity
 * chain from staff, not just a role variant of it.
 */
@RestController
@RequestMapping(ApiConstants.STOREFRONT_AUTH_BASE)
@Tag(name = "Auth - (Store Front App)")
public class StorefrontAuthController {

    // Distinct from the staff "accessToken"/"refreshToken" cookie names: both flows share
    // one API origin, so identically-named cookies would overwrite each other in the browser.
    private static final String ACCESS_COOKIE = "accessToken";
    private static final String REFRESH_COOKIE = "refreshToken";

    private final CustomerAuthService customerAuthService;
    private final AuthCookieService authCookieService;

    public StorefrontAuthController(CustomerAuthService customerAuthService, AuthCookieService authCookieService) {
        this.customerAuthService = customerAuthService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthenticatedCustomerResponse> register(
        @RequestBody @Valid RegisterCustomerRequest request,
        HttpServletResponse response
    ) {
        CustomerLoginResultResponse result = customerAuthService.register(request);
        setAuthCookies(response, result);
        return ResponseEntity.ok(result.customer());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticatedCustomerResponse> login(
        @RequestBody @Valid CustomerLoginRequest request,
        HttpServletResponse response
    ) {
        CustomerLoginResultResponse result = customerAuthService.login(request);
        setAuthCookies(response, result);
        return ResponseEntity.ok(result.customer());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthenticatedCustomerResponse> refresh(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
        HttpServletResponse response
    ) {
        if (refreshToken == null) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        CustomerLoginResultResponse result = customerAuthService.refresh(refreshToken);
        setAuthCookies(response, result);
        return ResponseEntity.ok(result.customer());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @CookieValue(name = REFRESH_COOKIE, required = true) String refreshToken,
        HttpServletResponse response
    ) {
        customerAuthService.logout(refreshToken);
        authCookieService.clearAuthCookies(response, ACCESS_COOKIE, REFRESH_COOKIE);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentCustomerResponse> me(@AuthenticationPrincipal AuthenticatedCustomer principal) {
        return ResponseEntity.ok(customerAuthService.getCurrentCustomer(principal.email()));
    }

    @PatchMapping("/me")
    public ResponseEntity<CurrentCustomerResponse> updateMe(
        @AuthenticationPrincipal AuthenticatedCustomer principal,
        @RequestBody @Valid UpdateCustomerProfileRequest request
    ) {
        return ResponseEntity.ok(customerAuthService.updateCurrentUser(principal.id(), request));
    }

    @PutMapping(value = "/me/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CurrentCustomerResponse> updateMyProfileImage(
        @AuthenticationPrincipal AuthenticatedCustomer principal,
        @RequestPart("image") MultipartFile image
    ) {
        return ResponseEntity.ok(customerAuthService.updateProfleImage(principal.id(), image));
    }

    /** Signs this browser out too: the cookies are cleared, so the customer logs in with the new password. */
    @PutMapping("/me/password")
    public ResponseEntity<Void> changeMyPassword(
        @AuthenticationPrincipal AuthenticatedCustomer principal,
        @RequestBody @Valid ChangePasswordRequest request,
        HttpServletResponse response
    ) {
        customerAuthService.changePassword(principal.id(), request);
        authCookieService.clearAuthCookies(response, ACCESS_COOKIE, REFRESH_COOKIE);
        return ResponseEntity.noContent().build();
    }

    private void setAuthCookies(HttpServletResponse response, CustomerLoginResultResponse result) {
        authCookieService.setAuthCookies(
            response,
            ACCESS_COOKIE,
            result.accessToken(),
            REFRESH_COOKIE,
            result.refreshToken()
        );
    }
}
