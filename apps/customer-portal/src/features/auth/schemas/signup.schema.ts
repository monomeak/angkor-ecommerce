import { z } from "zod";

/** Mirrors core-api's @StrongPassword so the user sees the rule before the API rejects it. */
export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(64, "Password must be at most 64 characters.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/\d/, "Password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character.");

export const signupSchema = z
    .object({
        firstName: z.string().min(1, "First name is required."),
        lastName: z.string().min(1, "Last name is required."),
        email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
        password: passwordSchema,
        confirmPassword: z.string()
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"]
    });
