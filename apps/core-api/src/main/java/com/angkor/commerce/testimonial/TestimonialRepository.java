package com.angkor.commerce.testimonial;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestimonialRepository extends JpaRepository<Testimonial, Long> {
    /** Every response carries the author's name, so the customer is fetched with the rows. */
    @EntityGraph(attributePaths = "customer")
    Page<Testimonial> findByStatus(TestimonialStatus status, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "customer")
    Page<Testimonial> findAll(Pageable pageable);

    @EntityGraph(attributePaths = "customer")
    Optional<Testimonial> findByCustomerId(Long customerId);

    @Override
    @EntityGraph(attributePaths = "customer")
    Optional<Testimonial> findById(Long id);
}
