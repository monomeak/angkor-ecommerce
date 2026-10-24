import { z } from "zod";

/*
 * The API base URL is per-deployment config from <AppConfigProvider>, not a
 * build-time constant, so it is passed in rather than read here. Callers get it
 * from useAppConfig() in the hook and hand it to the feature's api function.
 */

/** Shape of core-api's common/exception/ErrorResponse. */
type ApiErrorBody = {
    status?: number;
    error?: string;
    message?: string;
    errors?: Record<string, string>;
};

export class ApiError extends Error {
    readonly status: number;
    /** Per-field messages from bean validation, keyed by field name. */
    readonly fieldErrors?: Record<string, string>;

    constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.fieldErrors = fieldErrors;
    }

    /** First field message if the API sent one, else the top-level message. */
    get displayMessage(): string {
        const firstFieldError = this.fieldErrors ? Object.values(this.fieldErrors)[0] : undefined;
        return firstFieldError ?? this.message;
    }
}

/**
 * Validates a core-api response before it reaches domain code, so a changed or
 * broken payload fails here with a typed error rather than as `undefined` three
 * layers up. A schema mismatch is the server's fault, hence 502 rather than a
 * message blaming the customer.
 */
export function parseResponse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
    const result = schema.safeParse(data);

    if (!result.success) {
        if (process.env.NODE_ENV !== "production") {
            // The user-facing message stays generic; the mismatch itself is only
            // debuggable if we surface which fields failed.
            console.error("[api-client] Response failed schema validation:", z.flattenError(result.error));
        }

        throw new ApiError("The server returned an unexpected response.", 502);
    }

    return result.data;
}

type ApiFetchOptions = RequestInit & {
    /**
     * Access tokens live 15 minutes, so an expired one is the common 401. Refresh
     * once and replay the request. Disabled for the auth endpoints themselves.
     */
    retryOnUnauthorized?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(apiBaseUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${apiBaseUrl}/storefront/auth/refresh`, {
            method: "POST",
            credentials: "include"
        });
        return response.ok;
    } catch {
        return false;
    }
}

/** Single-flight: parallel 401s share one refresh instead of racing token rotation. */
function refreshSession(apiBaseUrl: string): Promise<boolean> {
    refreshInFlight ??= performRefresh(apiBaseUrl).finally(() => {
        refreshInFlight = null;
    });
    return refreshInFlight;
}

function buildRequest(apiBaseUrl: string, path: string, init: RequestInit): Request {
    const isFormData = init.body instanceof FormData;
    const headers = new Headers(init.headers);

    if (!isFormData && init.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }

    return new Request(`${apiBaseUrl}${path}`, {
        ...init,
        headers,
        // The httpOnly accessToken/refreshToken cookies are set on the API origin —
        // nothing works without this.
        credentials: "include"
    });
}

/**
 * `next: { revalidate, tags }` is a Next.js extension to RequestInit, and the `Request`
 * constructor drops any property it does not recognise — so it has to ride along in fetch's
 * second argument instead. Without this a server-side caller asking for ISR silently got an
 * uncached request, baked in at build time and never revalidated.
 *
 * No effect in the browser, where the option is simply ignored.
 */
function nextFetchOptions(init: RequestInit): RequestInit | undefined {
    return init.next ? { next: init.next } : undefined;
}

async function toApiError(response: Response): Promise<ApiError> {
    let body: ApiErrorBody | null = null;

    try {
        body = (await response.json()) as ApiErrorBody;
    } catch {
        // Non-JSON error (gateway, proxy, empty body) — fall through to the status text.
    }

    return new ApiError(
        body?.message ?? response.statusText ?? `Request failed (${response.status})`,
        response.status,
        body?.errors
    );
}

async function parseBody<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return undefined as T;
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiFetch<T>(apiBaseUrl: string, path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { retryOnUnauthorized = true, ...init } = options;

    let response: Response;
    try {
        response = await fetch(buildRequest(apiBaseUrl, path, init), nextFetchOptions(init));
    } catch {
        throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }

    if (response.status === 401 && retryOnUnauthorized && (await refreshSession(apiBaseUrl))) {
        // A Request body can only be read once, so rebuild rather than replay.
        response = await fetch(buildRequest(apiBaseUrl, path, init), nextFetchOptions(init));
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    return parseBody<T>(response);
}

export type DownloadedFile = {
    readonly blob: Blob;
    /** From Content-Disposition, when the API set one. */
    readonly filename: string | undefined;
};

function filenameFrom(contentDisposition: string | null): string | undefined {
    return contentDisposition?.match(/filename="?([^";]+)"?/)?.[1];
}

/**
 * apiFetch for binary bodies (PDFs). Same session refresh and error envelope — a failed render
 * comes back as the JSON error body, not as a broken file.
 */
export async function apiFetchFile(apiBaseUrl: string, path: string, accept: string): Promise<DownloadedFile> {
    const init: RequestInit = { headers: { Accept: accept } };

    let response: Response;
    try {
        response = await fetch(buildRequest(apiBaseUrl, path, init));
    } catch {
        throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }

    if (response.status === 401 && (await refreshSession(apiBaseUrl))) {
        response = await fetch(buildRequest(apiBaseUrl, path, init));
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    return { blob: await response.blob(), filename: filenameFrom(response.headers.get("Content-Disposition")) };
}
