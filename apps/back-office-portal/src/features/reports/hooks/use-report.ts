"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { fetchReport } from "../api/report-api";
import { reportKeys } from "../lib/query-keys";
import type { Report, ReportParams } from "../types/report";

export function useReport(params: ReportParams) {
    const { apiBaseUrl } = useAppConfig();

    return useQuery<Report>({
        queryKey: reportKeys.report(params),
        queryFn: () => fetchReport(apiBaseUrl, params),
        // Switching period keeps the old table on screen instead of collapsing to a skeleton
        // and back — the columns rarely change, so the layout would only flicker.
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000
    });
}
