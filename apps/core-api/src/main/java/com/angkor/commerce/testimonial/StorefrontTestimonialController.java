package com.angkor.commerce.testimonial;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.security.JwtAuthenticationFilter.AuthenticatedCustomer;
import com.angkor.commerce.testimonial.dto.request.SaveTestimonialRequest;
import com.angkor.commerce.testimonial.dto.response.PublicTestimonialResponse;
import com.angkor.commerce.testimonial.dto.response.TestimonialResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Storefront: testimonials")
public class StorefrontTestimonialController {

    private final TestimonialService testimonialService;

    @GetMapping(ApiConstants.STOREFRONT_TESTIMONIALS)
    @Operation(summary = "List approved testimonials (public)")
    public ResponseEntity<PageResponse<PublicTestimonialResponse>> getPublished(
        @RequestParam(defaultValue = "12") @Min(1) @Max(50) int limit,
        @RequestParam(defaultValue = "0") @Min(0) int skip
    ) {
        return ResponseEntity.ok(testimonialService.getPublished(limit, skip));
    }

    @GetMapping(ApiConstants.STOREFRONT_MY_TESTIMONIAL)
    @Operation(summary = "Get the signed-in customer's testimonial (404 if none)")
    public ResponseEntity<TestimonialResponse> getMine(@AuthenticationPrincipal AuthenticatedCustomer customer) {
        return ResponseEntity.ok(testimonialService.getMine(customer.id()));
    }

    @PutMapping(ApiConstants.STOREFRONT_MY_TESTIMONIAL)
    @Operation(summary = "Create or replace the signed-in customer's testimonial; it goes back to pending review")
    public ResponseEntity<TestimonialResponse> saveMine(
        @AuthenticationPrincipal AuthenticatedCustomer customer,
        @RequestBody @Valid SaveTestimonialRequest request
    ) {
        return ResponseEntity.ok(testimonialService.saveMine(customer.id(), request));
    }
}
