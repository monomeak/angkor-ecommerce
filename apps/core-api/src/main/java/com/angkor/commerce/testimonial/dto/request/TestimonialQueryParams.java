package com.angkor.commerce.testimonial.dto.request;

import com.angkor.commerce.common.dto.OffsetPageable;
import com.angkor.commerce.testimonial.TestimonialStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public record TestimonialQueryParams(@Min(0) Integer skip, @Min(1) @Max(100) Integer limit, TestimonialStatus status) {
    private static final int DEFAULT_LIMIT = 20;

    public int skipOrDefault() {
        return skip == null ? 0 : skip;
    }

    public int limitOrDefault() {
        return limit == null ? DEFAULT_LIMIT : limit;
    }

    /** Newest submissions first — the review queue is worked from the top. */
    public Pageable toPageable() {
        Sort sort = Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.DESC, "id"));
        return new OffsetPageable(skipOrDefault(), limitOrDefault(), sort);
    }
}
