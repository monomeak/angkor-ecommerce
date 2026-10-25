package com.angkor.commerce.testimonial;

import com.fasterxml.jackson.annotation.JsonValue;

/** PENDING -> APPROVED | REJECTED by staff. A customer edit sends it back to PENDING. */
public enum TestimonialStatus {
    PENDING,
    APPROVED,
    REJECTED;

    /** Lowercase on the wire. Reads are case-insensitive via JacksonConfig. */
    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    /** What staff may set. PENDING is reached only by the customer editing. */
    public boolean isReviewOutcome() {
        return this != PENDING;
    }
}
