package com.angkor.commerce.testimonial;

import com.angkor.commerce.common.BaseEntity;
import com.angkor.commerce.customer.Customer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "testimonials")
@Getter
@Setter
@NoArgsConstructor
public class Testimonial extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false, updatable = false)
    private Customer customer;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TestimonialStatus status = TestimonialStatus.PENDING;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** Any change to the words or the stars needs reviewing again. */
    public void revise(int rating, String message) {
        this.rating = rating;
        this.message = message;
        this.status = TestimonialStatus.PENDING;
        this.reviewedAt = null;
    }

    public void review(TestimonialStatus outcome, Instant at) {
        this.status = outcome;
        this.reviewedAt = at;
    }
}
