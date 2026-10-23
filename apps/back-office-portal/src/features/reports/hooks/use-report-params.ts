"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { buildReportSearchParams, parseReportSearchParams } from "../lib/search-params";
import type { ReportParams } from "../types/report";

/**
 * Report type and period live in the URL, so a report survives a refresh and can be shared.
 *
 * router.replace, not push: switching period is not navigation, and push would make the back
 * button walk through every period the reader tried.
 */
export function useReportParams(): {
    params: ReportParams;
    setParams: (patch: Partial<ReportParams>) => void;
} {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const params = useMemo(
        () => parseReportSearchParams(new URLSearchParams(searchParams.toString())),
        [searchParams]
    );

    const setParams = useCallback(
        (patch: Partial<ReportParams>) => {
            const query = buildReportSearchParams({ ...params, ...patch }).toString();

            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [params, pathname, router]
    );

    return { params, setParams };
}
