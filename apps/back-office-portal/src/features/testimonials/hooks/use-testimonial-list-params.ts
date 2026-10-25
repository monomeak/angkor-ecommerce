"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
    buildTestimonialSearchParams,
    getCurrentPage,
    parseTestimonialSearchParams,
    type TestimonialFilterPatch
} from "../lib/search-params";

/** Same arrangement as `useCustomerListParams`: the URL holds the state, updates replace. */
export function useTestimonialListParams() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const params = useMemo(
        () => parseTestimonialSearchParams(new URLSearchParams(searchParams.toString())),
        [searchParams]
    );

    const setParams = useCallback(
        (patch: TestimonialFilterPatch) => {
            const query = buildTestimonialSearchParams(new URLSearchParams(searchParams.toString()), patch).toString();

            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    return { params, page: getCurrentPage(params), setParams };
}
