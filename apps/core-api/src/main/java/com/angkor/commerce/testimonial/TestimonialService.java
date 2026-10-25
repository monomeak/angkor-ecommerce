package com.angkor.commerce.testimonial;

import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.testimonial.dto.request.SaveTestimonialRequest;
import com.angkor.commerce.testimonial.dto.request.TestimonialQueryParams;
import com.angkor.commerce.testimonial.dto.response.PublicTestimonialResponse;
import com.angkor.commerce.testimonial.dto.response.TestimonialResponse;

public interface TestimonialService {
    /** Approved only — what the storefront may show to anyone. */
    PageResponse<PublicTestimonialResponse> getPublished(int limit, int skip);

    TestimonialResponse getMine(Long customerId);

    /** Creates or replaces the customer's one testimonial, and either way queues it for review. */
    TestimonialResponse saveMine(Long customerId, SaveTestimonialRequest request);

    PageResponse<TestimonialResponse> getTestimonials(TestimonialQueryParams query);

    TestimonialResponse review(Long id, TestimonialStatus outcome);
}
