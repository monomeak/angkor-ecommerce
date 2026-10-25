"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { useCurrentCustomer } from "@/src/features/auth/hooks/use-current-customer";
import { fetchMyTestimonial, fetchPublishedTestimonials, saveMyTestimonial } from "../api/testimonial-api";
import { testimonialKeys } from "../lib/query-keys";
import type { SaveTestimonialPayload } from "../types/testimonial";

export function usePublishedTestimonials(limit: number) {
    const { apiBaseUrl } = useAppConfig();

    return useQuery({
        queryKey: testimonialKeys.published(limit),
        queryFn: () => fetchPublishedTestimonials(apiBaseUrl, limit),
        staleTime: 5 * 60 * 1000
    });
}

/** `null` once resolved means "hasn't written one". Gated on `/me` — the endpoint is customer-scoped. */
export function useMyTestimonial() {
    const { data: customer } = useCurrentCustomer();
    const { apiBaseUrl } = useAppConfig();

    return useQuery({
        queryKey: testimonialKeys.mine(),
        queryFn: () => fetchMyTestimonial(apiBaseUrl),
        enabled: Boolean(customer)
    });
}

export function useSaveMyTestimonial() {
    const queryClient = useQueryClient();
    const { apiBaseUrl } = useAppConfig();

    return useMutation({
        mutationFn: (payload: SaveTestimonialPayload) => saveMyTestimonial(apiBaseUrl, payload),
        onSuccess: (testimonial) => {
            queryClient.setQueryData(testimonialKeys.mine(), testimonial);
            // An edit pulls an approved one off the home page until it is reviewed again.
            void queryClient.invalidateQueries({ queryKey: [...testimonialKeys.all, "published"] });
        }
    });
}
