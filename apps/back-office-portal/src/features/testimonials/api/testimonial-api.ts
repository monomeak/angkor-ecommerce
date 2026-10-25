import { apiFetch, parseResponse } from "@/lib/api-client";
import { mapTestimonial, mapTestimonialList } from "../mappers/testimonial.mapper";
import { testimonialDtoSchema, testimonialListDtoSchema } from "../schemas/testimonial-api.schema";
import type { ReviewOutcome, Testimonial, TestimonialListParams, TestimonialListResult } from "../types/testimonial";

const TESTIMONIALS_BASE = "/testimonials";

export async function fetchTestimonials(
    apiBaseUrl: string,
    params: TestimonialListParams
): Promise<TestimonialListResult> {
    const search = new URLSearchParams({ skip: String(params.skip), limit: String(params.limit) });
    // "all" is sent as no status at all; `?status=` would fail enum conversion with a 400.
    if (params.filter !== "all") search.set("status", params.filter);

    const data = await apiFetch<unknown>(apiBaseUrl, `${TESTIMONIALS_BASE}?${search.toString()}`);

    return mapTestimonialList(parseResponse(testimonialListDtoSchema, data));
}

export async function reviewTestimonial(apiBaseUrl: string, id: number, status: ReviewOutcome): Promise<Testimonial> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${TESTIMONIALS_BASE}/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });

    return mapTestimonial(parseResponse(testimonialDtoSchema, data));
}
