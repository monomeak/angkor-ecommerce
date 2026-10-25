import { z } from "zod";

/** Lowercase on the wire — `TestimonialStatus` has `@JsonValue`. */
export const testimonialStatusSchema = z.enum(["pending", "approved", "rejected"]);

/** `GET /storefront/testimonials` row: approved only, so it carries no status. */
export const publicTestimonialDtoSchema = z.object({
    id: z.number(),
    rating: z.number(),
    message: z.string(),
    authorName: z.string(),
    /** Raw MinIO object key, like `/me`'s image. */
    authorImage: z.string().nullable(),
    createdAt: z.string()
});

export const publicTestimonialPageDtoSchema = z.object({
    testimonials: z.array(publicTestimonialDtoSchema),
    total: z.number(),
    skip: z.number(),
    limit: z.number()
});

/** `GET|PUT /storefront/my-testimonial` — the owner's view, with where it stands in review. */
export const myTestimonialDtoSchema = z.object({
    id: z.number(),
    customerId: z.number(),
    rating: z.number(),
    message: z.string(),
    authorName: z.string(),
    status: testimonialStatusSchema,
    reviewedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
});

export type PublicTestimonialDto = z.infer<typeof publicTestimonialDtoSchema>;
export type PublicTestimonialPageDto = z.infer<typeof publicTestimonialPageDtoSchema>;
export type MyTestimonialDto = z.infer<typeof myTestimonialDtoSchema>;
