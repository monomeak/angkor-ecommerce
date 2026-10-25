package com.angkor.commerce.testimonial;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.security.annotation.IsShopUser;
import com.angkor.commerce.testimonial.dto.request.TestimonialQueryParams;
import com.angkor.commerce.testimonial.dto.request.UpdateTestimonialStatusRequest;
import com.angkor.commerce.testimonial.dto.response.TestimonialResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.TESTIMONIALS_BASE)
@RequiredArgsConstructor
@Validated
@Tag(name = "Testimonials (Back Office)")
public class BackOfficeTestimonialController {

    private final TestimonialService testimonialService;

    @GetMapping
    @IsShopUser
    @Operation(summary = "List testimonials, optionally by status (pending is the review queue)")
    public ResponseEntity<PageResponse<TestimonialResponse>> getTestimonials(@Valid TestimonialQueryParams query) {
        return ResponseEntity.ok(testimonialService.getTestimonials(query));
    }

    @PatchMapping("/{id}/status")
    @IsShopUser
    @Operation(summary = "Approve or reject a testimonial")
    public ResponseEntity<TestimonialResponse> review(
        @PathVariable Long id,
        @Valid @RequestBody UpdateTestimonialStatusRequest request
    ) {
        return ResponseEntity.ok(testimonialService.review(id, request.status()));
    }
}
