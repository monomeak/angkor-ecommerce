import { ApiError, apiFetch, parseResponse } from "@/lib/api-client";
import { mapMyTestimonial, mapPublicTestimonialPage } from "../mappers/testimonial.mapper";
import { myTestimonialDtoSchema, publicTestimonialPageDtoSchema } from "../schemas/testimonial-api.schema";
import type { MyTestimonial, PublicTestimonialPage, SaveTestimonialPayload } from "../types/testimonial";

/** Public — no session needed, the home page reads it for everyone. */
const PUBLIC_BASE = "/storefront/testimonials";
/** Customer-scoped; the API reads the customer off the session. */
const MINE_BASE = "/storefront/my-testimonial";

export async function fetchPublishedTestimonials(apiBaseUrl: string, limit: number): Promise<PublicTestimonialPage> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${PUBLIC_BASE}?limit=${limit}`);

    return mapPublicTestimonialPage(parseResponse(publicTestimonialPageDtoSchema, data));
}

/** 404 is the normal answer for a customer who hasn't written one yet. */
export async function fetchMyTestimonial(apiBaseUrl: string): Promise<MyTestimonial | null> {
    try {
        const data = await apiFetch<unknown>(apiBaseUrl, MINE_BASE);

        return mapMyTestimonial(parseResponse(myTestimonialDtoSchema, data));
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}

/** PUT, because a customer has at most one — the first save creates it, later ones replace it. */
export async function saveMyTestimonial(apiBaseUrl: string, payload: SaveTestimonialPayload): Promise<MyTestimonial> {
    const data = await apiFetch<unknown>(apiBaseUrl, MINE_BASE, {
        method: "PUT",
        body: JSON.stringify(payload)
    });

    return mapMyTestimonial(parseResponse(myTestimonialDtoSchema, data));
}
