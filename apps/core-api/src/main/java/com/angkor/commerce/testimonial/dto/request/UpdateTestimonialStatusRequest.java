package com.angkor.commerce.testimonial.dto.request;

import com.angkor.commerce.testimonial.TestimonialStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTestimonialStatusRequest(@NotNull(message = "Status is required") TestimonialStatus status) {}
