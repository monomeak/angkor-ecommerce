import { z } from "zod";

/** Mirrors core-api's UpdateProfileRequest constraints. */
export const profileFormSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required").max(100, "First name must be at most 100 characters"),
    lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name must be at most 100 characters"),
    email: z.string().trim().pipe(z.email("Email must be a valid email address")),
    phone: z.string().trim()
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
