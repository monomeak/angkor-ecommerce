import { z } from "zod";

/** Mirrors `SaveTestimonialRequest`; the API re-checks all of it. */
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1000;

export const testimonialFormSchema = z.object({
    rating: z.number().int().min(1, "Choose a star rating.").max(5, "Choose a star rating."),
    message: z
        .string()
        .trim()
        .min(MESSAGE_MIN, `Tell us a little more — at least ${MESSAGE_MIN} characters.`)
        .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`)
});

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;
export type TestimonialFormField = keyof TestimonialFormValues;
