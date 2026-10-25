import { z } from "zod";

/** Lowercase on the wire — `TestimonialStatus` carries @JsonValue. */
export const testimonialStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const testimonialDtoSchema = z.object({
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

export const testimonialListDtoSchema = z.object({
    testimonials: z.array(testimonialDtoSchema),
    total: z.number(),
    skip: z.number(),
    limit: z.number()
});

export type TestimonialDto = z.infer<typeof testimonialDtoSchema>;
export type TestimonialListDto = z.infer<typeof testimonialListDtoSchema>;
