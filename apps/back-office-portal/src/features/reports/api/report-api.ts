import { apiFetch, parseResponse } from "@/lib/api-client";
import { reportDtoSchema } from "../schemas/report-api.schema";
import type { Report, ReportParams } from "../types/report";

/*
 * One call per report. The DTO needs no mapping — the envelope is already the shape the table
 * and the CSV writer consume, which is the whole point of core-api shipping `columns` with the
 * data rather than the client knowing each report's fields.
 */

export async function fetchReport(apiBaseUrl: string, { type, period }: ReportParams): Promise<Report> {
    const data = await apiFetch<unknown>(apiBaseUrl, `/reports/${type}?period=${period}`);

    return parseResponse(reportDtoSchema, data);
}
