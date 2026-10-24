import type { CurrentUser } from "@/src/features/auth/types/auth";

import type { ProfileFormValues } from "../schemas/profile.schema";
import type { UpdateProfilePayload } from "../types/profile";

export function toProfileFormValues(user: CurrentUser): ProfileFormValues {
    return {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? ""
    };
}

/** Sends only what changed, so an untouched email never trips the uniqueness check. */
export function toUpdateProfilePayload(
    values: ProfileFormValues,
    dirtyFields: Partial<Record<keyof ProfileFormValues, boolean>>
): UpdateProfilePayload {
    const payload: UpdateProfilePayload = {};

    for (const key of Object.keys(values) as (keyof ProfileFormValues)[]) {
        if (dirtyFields[key]) {
            payload[key] = values[key];
        }
    }

    return payload;
}
