import { apiFetch, parseResponse } from "@/lib/api-client";
import { currentUserSchema } from "@/src/features/auth/schemas/user.schema";
import { mapToCurrentUser } from "@/src/features/auth/mappers/auth.mapper";
import type { CurrentUser } from "@/src/features/auth/types/auth";

import type { UpdateProfilePayload } from "../types/profile";

const ME_BASE = "/auth/me";

/** Omitted fields are left alone — core-api treats null as "no change". */
export async function updateProfile(apiBaseUrl: string, payload: UpdateProfilePayload): Promise<CurrentUser> {
    const data = await apiFetch<unknown>(apiBaseUrl, ME_BASE, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });

    return mapToCurrentUser(parseResponse(currentUserSchema, data));
}

/**
 * The avatar goes through its own multipart endpoint rather than PATCH: core-api stores the
 * file in MinIO and writes the object key itself. The response is a UserResponse, a superset
 * of /auth/me, so the same schema parses it.
 */
export async function uploadProfileImage(apiBaseUrl: string, file: File): Promise<CurrentUser> {
    const body = new FormData();
    body.append("image", file);

    const data = await apiFetch<unknown>(apiBaseUrl, `${ME_BASE}/image`, { method: "PUT", body });

    return mapToCurrentUser(parseResponse(currentUserSchema, data));
}
