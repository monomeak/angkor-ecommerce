import { z } from "zod";

import { passwordSchema } from "@/src/features/auth/schemas/signup.schema";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current one.",
    path: ["newPassword"],
  });

export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";
