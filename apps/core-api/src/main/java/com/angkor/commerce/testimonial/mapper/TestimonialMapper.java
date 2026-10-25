package com.angkor.commerce.testimonial.mapper;

import com.angkor.commerce.customer.Customer;
import com.angkor.commerce.testimonial.Testimonial;
import com.angkor.commerce.testimonial.dto.response.PublicTestimonialResponse;
import com.angkor.commerce.testimonial.dto.response.TestimonialResponse;
import org.springframework.stereotype.Component;

@Component
public class TestimonialMapper {

    private static final String FALLBACK_AUTHOR = "Angkor customer";

    public PublicTestimonialResponse toPublicResponse(Testimonial testimonial) {
        Customer customer = testimonial.getCustomer();

        return new PublicTestimonialResponse(
            testimonial.getId(),
            testimonial.getRating(),
            testimonial.getMessage(),
            authorName(customer),
            customer.getImage(),
            testimonial.getCreatedAt()
        );
    }

    public TestimonialResponse toResponse(Testimonial testimonial) {
        Customer customer = testimonial.getCustomer();

        return new TestimonialResponse(
            testimonial.getId(),
            customer.getId(),
            testimonial.getRating(),
            testimonial.getMessage(),
            authorName(customer),
            testimonial.getStatus(),
            testimonial.getReviewedAt(),
            testimonial.getCreatedAt(),
            testimonial.getUpdatedAt()
        );
    }

    /** "Sokha P." — read at request time, so a renamed customer's reviews follow the new name. */
    private String authorName(Customer customer) {
        String first = trimToNull(customer.getFirstName());
        String last = trimToNull(customer.getLastName());

        if (first != null) {
            return last != null ? first + " " + last.charAt(0) + "." : first;
        }
        if (last != null) {
            return last;
        }
        String company = trimToNull(customer.getCompanyName());
        return company != null ? company : FALLBACK_AUTHOR;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
