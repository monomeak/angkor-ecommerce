/**
 * core-api's ReportResponse, one envelope for every report.
 *
 * The report describes its own shape: `columns` says what the fields are, what to call them
 * and how to format them, and `rows` is keyed by `column.key`. That is why one table component
 * and one CSV writer cover both reports here — and why a third report costs a SQL query on the
 * backend and nothing at all on this side.
 */

export const REPORT_TYPES = ["invoices", "sales-by-category"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_PERIODS = ["this_month", "last_3_months", "last_6_months", "last_12_months"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export type ColumnAlign = "LEFT" | "RIGHT";
export type ColumnFormat = "TEXT" | "NUMBER" | "MONEY" | "PERCENT" | "DATE";

export interface ReportColumn {
    key: string;
    label: string;
    align: ColumnAlign;
    format: ColumnFormat;
}

/** Cells are whatever the column's format says they are, so the row is deliberately loose. */
export type ReportRow = Record<string, string | number | null>;

export interface Report {
    reportType: string;
    title: string;
    /** Resolved server-side: a preset is undatable once the file is saved. */
    startDate: string;
    /** Inclusive. */
    endDate: string;
    /** "cash" — paid invoices only, counted in the period the money arrived. */
    basis: string;
    currency: string;
    generatedAt: string;
    columns: ReportColumn[];
    rows: ReportRow[];
    /** Computed over the whole period by its own query, never the sum of the rows above. */
    totals: ReportRow;
}

export interface ReportParams {
    type: ReportType;
    period: ReportPeriod;
}
