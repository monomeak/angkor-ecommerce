"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { fetchTestimonials, reviewTestimonial } from "../api/testimonial-api";
import { testimonialKeys } from "../lib/query-keys";
import type { ReviewOutcome, TestimonialListParams } from "../types/testimonial";

export function useTestimonials(params: TestimonialListParams) {
    const { apiBaseUrl } = useAppConfig();

    return useQuery({
        queryKey: testimonialKeys.list(params),
        queryFn: () => fetchTestimonials(apiBaseUrl, params),
        placeholderData: keepPreviousData
    });
}

export function useReviewTestimonial() {
    const queryClient = useQueryClient();
    const { apiBaseUrl } = useAppConfig();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: ReviewOutcome }) =>
            reviewTestimonial(apiBaseUrl, id, status),
        // Invalidated rather than patched: a reviewed row leaves the pending tab and joins
        // another, and every tab's total moves with it.
        onSuccess: () => queryClient.invalidateQueries({ queryKey: testimonialKeys.lists() })
    });
}
