package com.angkor.commerce.testimonial.dto.response;

import java.time.Instant;

/**
 * What any visitor sees. {@code authorName} is first name plus last initial, never the full
 * name or email; {@code authorImage} is the raw MinIO object key, like {@code /me}'s image.
 */
public record PublicTestimonialResponse(
    Long id,
    Integer rating,
    String message,
    String authorName,
    String authorImage,
    Instant createdAt
) {}
