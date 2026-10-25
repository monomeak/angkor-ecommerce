export type TestimonialStatus = "pending" | "approved" | "rejected";

/** The queue's filter. "all" is a URL value only — the API takes no status for it. */
export type TestimonialFilter = TestimonialStatus | "all";

/** What staff can set. PENDING is reached only by the customer editing their review. */
export type ReviewOutcome = Exclude<TestimonialStatus, "pending">;

export interface Testimonial {
    id: number;
    customerId: number;
    rating: number;
    message: string;
    /** First name plus last initial — the same name the storefront prints. */
    authorName: string;
    status: TestimonialStatus;
    reviewedAt: string | null;
    createdAt: string;
    /** Bumped by every customer edit, which is what puts a review back in the queue. */
    updatedAt: string;
}

export interface TestimonialListParams {
    filter: TestimonialFilter;
    skip: number;
    limit: number;
}

export interface TestimonialListResult {
    testimonials: Testimonial[];
    total: number;
}
