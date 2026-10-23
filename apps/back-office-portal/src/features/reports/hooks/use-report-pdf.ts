"use client";

import { useMutation } from "@tanstack/react-query";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { saveFile } from "@/src/shared/lib/download-file";
import { fetchReportPdf } from "../api/report-api";
import type { ReportParams } from "../types/report";

/** A mutation, not a query: each click is a fresh render, and nothing should cache a PDF blob. */
export function useReportPdf() {
    const { apiBaseUrl } = useAppConfig();

    return useMutation({
        mutationFn: (params: ReportParams) => fetchReportPdf(apiBaseUrl, params),
        onSuccess: ({ blob, filename }, params) => saveFile(filename ?? `${params.type}_${params.period}.pdf`, blob)
    });
}
