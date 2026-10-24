import { z } from "zod";

import { appRoleSchema } from "@/src/features/auth/schemas/user.schema";

/** Mirrors core-api's @StrongPassword: 8–64 chars with lower, upper, digit and symbol. */
export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

/** Mirrors core-api's CreateUserRequest constraints. */
export const addMemberSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required").max(100, "First name must be at most 100 characters"),
    lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name must be at most 100 characters"),
    username: z
        .string()
        .trim()
        .min(3, "Username must be between 3 and 100 characters")
        .max(100, "Username must be between 3 and 100 characters")
        .regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, '.', '_' and '-'"),
    email: z.string().trim().pipe(z.email("Email must be a valid email address")),
    phone: z.string().trim(),
    password: z
        .string()
        .min(8, "Password must be between 8 and 64 characters")
        .max(64, "Password must be between 8 and 64 characters")
        .regex(STRONG_PASSWORD_PATTERN, "Password must contain uppercase, lowercase, number, and special character"),
    role: appRoleSchema.nullable().refine((role) => role !== null, "Role is required")
});

export type AddMemberValues = z.input<typeof addMemberSchema>;
