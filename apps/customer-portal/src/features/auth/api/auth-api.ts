import { ApiError, apiFetch, parseResponse } from "@/lib/api-client";
import { authCustomerSchema, currentCustomerSchema } from "../schemas/customer.schema";
import type {
    AuthCustomer,
    ChangePasswordPayload,
    CurrentCustomer,
    LoginPayload,
    RegisterPayload,
    UpdateProfilePayload
} from "../types/auth";

const AUTH_BASE = "/storefront/auth";

export async function registerRequest(apiBaseUrl: string, payload: RegisterPayload): Promise<AuthCustomer> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${AUTH_BASE}/register`, {
        method: "POST",
        body: JSON.stringify(payload),
        retryOnUnauthorized: false
    });

    return parseResponse(authCustomerSchema, data);
}

export async function loginRequest(apiBaseUrl: string, payload: LoginPayload): Promise<AuthCustomer> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${AUTH_BASE}/login`, {
        method: "POST",
        body: JSON.stringify(payload),
        retryOnUnauthorized: false
    });

    return parseResponse(authCustomerSchema, data);
}

export async function logoutRequest(apiBaseUrl: string): Promise<void> {
    await apiFetch<void>(apiBaseUrl, `${AUTH_BASE}/logout`, { method: "POST", retryOnUnauthorized: false });
}

/**
 * Returns null when nobody is signed in: the cookies are httpOnly, so asking the API
 * is the only way to find out, and a 401 here is an expected answer rather than a fault.
 */
export async function fetchCurrentCustomer(apiBaseUrl: string): Promise<CurrentCustomer | null> {
    try {
        return parseResponse(currentCustomerSchema, await apiFetch<unknown>(apiBaseUrl, `${AUTH_BASE}/me`));
    } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
            return null;
        }
        throw cause;
    }
}

export async function updateProfileRequest(
    apiBaseUrl: string,
    payload: UpdateProfilePayload
): Promise<CurrentCustomer> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${AUTH_BASE}/me`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });

    return parseResponse(currentCustomerSchema, data);
}

/**
 * 204 with the auth cookies cleared: core-api revokes every refresh token the customer holds,
 * this browser's included, so every session signs in again with the new password.
 */
export async function changePasswordRequest(apiBaseUrl: string, payload: ChangePasswordPayload): Promise<void> {
    await apiFetch<void>(apiBaseUrl, `${AUTH_BASE}/me/password`, {
        method: "PUT",
        body: JSON.stringify(payload)
    });
}

export async function uploadProfileImageRequest(
    apiBaseUrl: string,
    image: Blob,
    fileName: string
): Promise<CurrentCustomer> {
    const body = new FormData();
    body.append("image", image, fileName);

    const data = await apiFetch<unknown>(apiBaseUrl, `${AUTH_BASE}/me/image`, { method: "PUT", body });

    return parseResponse(currentCustomerSchema, data);
}
