package com.angkor.commerce.testimonial.dto.response;

import com.angkor.commerce.testimonial.TestimonialStatus;
import java.time.Instant;

/** The owner's and the back office's view: everything public, plus where it stands in review. */
public record TestimonialResponse(
    Long id,
    Long customerId,
    Integer rating,
    String message,
    String authorName,
    TestimonialStatus status,
    Instant reviewedAt,
    Instant createdAt,
    Instant updatedAt
) {}
