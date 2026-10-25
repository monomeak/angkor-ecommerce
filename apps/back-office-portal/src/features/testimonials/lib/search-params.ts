import type { TestimonialFilter, TestimonialListParams } from "../types/testimonial";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
/** Matches core-api's TestimonialQueryParams.DEFAULT_LIMIT. */
export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** The screen is a review queue, so with no filter in the URL it opens on what needs doing. */
export const DEFAULT_FILTER: TestimonialFilter = "pending";
export const FILTERS: TestimonialFilter[] = ["pending", "approved", "rejected", "all"];

function parsePositiveInt(value: string | null): number | undefined {
    if (!value) return undefined;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** Validated on the way in, like the customer list: a hand-edited URL is untrusted input. */
export function parseTestimonialSearchParams(params: URLSearchParams): TestimonialListParams {
    const status = params.get("status") as TestimonialFilter | null;
    const limit = Math.min(parsePositiveInt(params.get("limit")) ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const page = parsePositiveInt(params.get("page")) ?? 1;

    return {
        filter: status && FILTERS.includes(status) ? status : DEFAULT_FILTER,
        skip: (page - 1) * limit,
        limit
    };
}

export function getCurrentPage(params: TestimonialListParams): number {
    return Math.floor(params.skip / params.limit) + 1;
}

export type TestimonialFilterPatch = {
    filter?: TestimonialFilter;
    limit?: number;
    page?: number;
};

/** Defaults are dropped from the URL, and anything but paging goes back to page 1. */
export function buildTestimonialSearchParams(current: URLSearchParams, patch: TestimonialFilterPatch): URLSearchParams {
    const next = new URLSearchParams(current.toString());

    const setOrDelete = (key: string, value: string | null) => {
        if (value === null) next.delete(key);
        else next.set(key, value);
    };

    if ("filter" in patch) setOrDelete("status", patch.filter === DEFAULT_FILTER ? null : (patch.filter ?? null));
    if ("limit" in patch) setOrDelete("limit", patch.limit === DEFAULT_PAGE_SIZE ? null : String(patch.limit));

    const isPagingOnly = Object.keys(patch).length === 1 && "page" in patch;
    const page = isPagingOnly ? patch.page : 1;
    setOrDelete("page", page && page > 1 ? String(page) : null);

    return next;
}
