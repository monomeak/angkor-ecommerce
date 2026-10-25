package com.angkor.commerce.security;

import com.angkor.commerce.common.ApiConstants;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
        "/actuator/health",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        ApiConstants.STOREFRONT_AUTH_BASE + "/register",
        ApiConstants.STOREFRONT_AUTH_BASE + "/login",
        ApiConstants.STOREFRONT_AUTH_BASE + "/refresh",
        "/actuator/info",
        "/v3/api-docs/**",
        "/scalar",
        "/scalar/**"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        RestAuthenticationEntryPoint restAuthenticationEntryPoint,
        CustomAccessDeniedHandler customAccessDeniedHandler,
        CorsConfigurationSource corsConfigurationSource
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.restAuthenticationEntryPoint = restAuthenticationEntryPoint;
        this.customAccessDeniedHandler = customAccessDeniedHandler;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource)
        throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(handling ->
                handling
                    .authenticationEntryPoint(restAuthenticationEntryPoint)
                    .accessDeniedHandler(customAccessDeniedHandler)
            )
            .authorizeHttpRequests(auth ->
                auth
                    // ── PUBLIC — no token. Everything open lives here, together. ──

                    .requestMatchers(PUBLIC_ENDPOINTS)
                    .permitAll()
                    // Gateway pushbacks: ABA cannot present a JWT. Safe because the
                    // payload is never trusted — see AbaPayWayGatewayAdapter.
                    .requestMatchers("/api/v1/payment-callbacks/**")
                    .permitAll()

                    // Catalogue browsing: storefront reads before login.
                    .requestMatchers(
                        HttpMethod.GET,
                        ApiConstants.CATEGORIES_BASE,
                        ApiConstants.CATEGORIES_BASE + "/**",
                        ApiConstants.PRODUCTS_BASE,
                        ApiConstants.PRODUCTS_BASE + "/**"
                    )
                    .permitAll()
                    // Approved testimonials on the home page. Must precede the CUSTOMER rule below.
                    .requestMatchers(HttpMethod.GET, ApiConstants.STOREFRONT_TESTIMONIALS)
                    .permitAll()
                    // ── AUTHENTICATED, either principal type ──
                    .requestMatchers(
                        ApiConstants.AUTH_BASE + "/me",
                        ApiConstants.AUTH_BASE + "/logout",
                        ApiConstants.STOREFRONT_AUTH_BASE + "/me",
                        ApiConstants.STOREFRONT_AUTH_BASE + "/logout"
                    )
                    .authenticated()
                    // ── CUSTOMER ──
                    .requestMatchers("/api/v1/storefront/**")
                    .hasRole("CUSTOMER")

                    // ── ADMIN ── team management. Must precede the shop-user rule below.
                    .requestMatchers("/api/v1/users/**")
                    .hasAnyRole("SHOP_ADMIN", "SUPER_ADMIN")

                    // ── SHOP USER ── any back-office role (catalogue writes fall here: GET was
                    // matched above). Admin-only actions inside narrow it with @PreAuthorize.
                    .requestMatchers(
                        "/api/v1/customers/**",
                        "/api/v1/products/**",
                        "/api/v1/categories/**",
                        "/api/v1/orders/**",
                        "/api/v1/invoices/**",
                        "/api/v1/dashboard/**",
                        "/api/v1/payments/**",
                        "/api/v1/payment-intents/**",
                        "/api/v1/reports/**",
                        "/api/v1/testimonials/**"
                    )
                    .hasAnyRole("STAFF", "SHOP_ADMIN", "SUPER_ADMIN")

                    // ── Everything unlisted requires a token ──
                    .anyRequest()
                    .authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    @Profile("!prod")
    @Order(1) // evaluated before the main chain
    SecurityFilterChain devFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/api/v1/dev/**")
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
        CustomUserDetailsService userDetailsService,
        PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }
}
