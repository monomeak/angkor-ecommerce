/** Body of PATCH /auth/me. No role or status — those are an administrator's call. */
export interface UpdateProfilePayload {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}
