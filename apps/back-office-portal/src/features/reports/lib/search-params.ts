import { REPORT_PERIODS, REPORT_TYPES, type ReportParams, type ReportPeriod, type ReportType } from "../types/report";

/**
 * URL search params are the source of truth (AGENTS.md), so a report anyone is looking at can
 * be pasted to a colleague and open on the same numbers.
 *
 * Both values are validated on the way in: a hand-edited `?period=banana` would otherwise
 * reach core-api and come back a 400 rather than simply falling back to the default.
 */

export const DEFAULT_TYPE: ReportType = "invoices";
export const DEFAULT_PERIOD: ReportPeriod = "this_month";

export function parseReportSearchParams(params: URLSearchParams): ReportParams {
    const type = params.get("type");
    const period = params.get("period");

    return {
        type: REPORT_TYPES.includes(type as ReportType) ? (type as ReportType) : DEFAULT_TYPE,
        period: REPORT_PERIODS.includes(period as ReportPeriod) ? (period as ReportPeriod) : DEFAULT_PERIOD
    };
}

/** Defaults are left out of the URL so the common case stays a clean `/reports`. */
export function buildReportSearchParams({ type, period }: ReportParams): URLSearchParams {
    const next = new URLSearchParams();

    if (type !== DEFAULT_TYPE) next.set("type", type);
    if (period !== DEFAULT_PERIOD) next.set("period", period);

    return next;
}
