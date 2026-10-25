package com.angkor.commerce.testimonial.impl;

import com.angkor.commerce.common.CollectionKeys;
import com.angkor.commerce.common.dto.OffsetPageable;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.common.exception.ResourceNotFoundException;
import com.angkor.commerce.common.exception.ValidationException;
import com.angkor.commerce.customer.Customer;
import com.angkor.commerce.testimonial.Testimonial;
import com.angkor.commerce.testimonial.TestimonialRepository;
import com.angkor.commerce.testimonial.TestimonialService;
import com.angkor.commerce.testimonial.TestimonialStatus;
import com.angkor.commerce.testimonial.dto.request.SaveTestimonialRequest;
import com.angkor.commerce.testimonial.dto.request.TestimonialQueryParams;
import com.angkor.commerce.testimonial.dto.response.PublicTestimonialResponse;
import com.angkor.commerce.testimonial.dto.response.TestimonialResponse;
import com.angkor.commerce.testimonial.mapper.TestimonialMapper;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TestimonialServiceImpl implements TestimonialService {

    private final TestimonialRepository testimonialRepository;
    private final TestimonialMapper testimonialMapper;
    // For a Customer reference without reaching into the customer module's repository.
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PublicTestimonialResponse> getPublished(int limit, int skip) {
        Sort sort = Sort.by(Sort.Direction.DESC, "reviewedAt").and(Sort.by(Sort.Direction.DESC, "id"));
        Page<Testimonial> page = testimonialRepository.findByStatus(
            TestimonialStatus.APPROVED,
            new OffsetPageable(skip, limit, sort)
        );

        return PageResponse.of(
            CollectionKeys.TESTIMONIALS,
            page.getContent().stream().map(testimonialMapper::toPublicResponse).toList(),
            page.getTotalElements(),
            skip,
            limit
        );
    }

    @Override
    @Transactional(readOnly = true)
    public TestimonialResponse getMine(Long customerId) {
        return testimonialRepository
            .findByCustomerId(customerId)
            .map(testimonialMapper::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("You have not left a testimonial yet"));
    }

    @Override
    @Transactional
    public TestimonialResponse saveMine(Long customerId, SaveTestimonialRequest request) {
        Testimonial testimonial = testimonialRepository
            .findByCustomerId(customerId)
            .orElseGet(() -> {
                Testimonial created = new Testimonial();
                // A proxy, not a SELECT: the id came off the session, so the row exists.
                created.setCustomer(entityManager.getReference(Customer.class, customerId));
                return created;
            });

        testimonial.revise(request.rating(), request.message().trim());

        // saveAndFlush so createdAt/updatedAt are populated in the response, and a race between
        // two first submissions surfaces here as the unique constraint (409) rather than later.
        return testimonialMapper.toResponse(testimonialRepository.saveAndFlush(testimonial));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TestimonialResponse> getTestimonials(TestimonialQueryParams query) {
        Page<Testimonial> page = query.status() == null
            ? testimonialRepository.findAll(query.toPageable())
            : testimonialRepository.findByStatus(query.status(), query.toPageable());

        return PageResponse.of(
            CollectionKeys.TESTIMONIALS,
            page.getContent().stream().map(testimonialMapper::toResponse).toList(),
            page.getTotalElements(),
            query.skipOrDefault(),
            query.limitOrDefault()
        );
    }

    @Override
    @Transactional
    public TestimonialResponse review(Long id, TestimonialStatus outcome) {
        if (!outcome.isReviewOutcome()) {
            throw new ValidationException(
                "A testimonial can only be approved or rejected",
                Map.of("status", "Must be approved or rejected")
            );
        }

        Testimonial testimonial = testimonialRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Testimonial with ID " + id + " was not found"));

        testimonial.review(outcome, Instant.now());

        return testimonialMapper.toResponse(testimonialRepository.saveAndFlush(testimonial));
    }
}
