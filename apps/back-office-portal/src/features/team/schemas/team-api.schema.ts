import { z } from "zod";

import { accountStatusSchema, appRoleSchema } from "@/src/features/auth/schemas/user.schema";

/** `/users` UserResponse. `image` is a raw object key; names are nullable on old accounts. */
export const teamMemberDtoSchema = z.object({
    id: z.number(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    username: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    image: z.string().nullable(),
    role: appRoleSchema,
    status: accountStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string()
});

export const teamMemberListDtoSchema = z.object({
    users: z.array(teamMemberDtoSchema),
    total: z.number(),
    skip: z.number(),
    limit: z.number()
});

export type TeamMemberDto = z.infer<typeof teamMemberDtoSchema>;
