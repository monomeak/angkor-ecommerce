import { formatDate, formatMoney, formatPercent } from "@/lib/formatters";
import type { ReportColumn, ReportRow } from "../types/report";

/**
 * The screen twin of the `cell` helper in the jsreport `report` template: same column formats,
 * same fallback for a missing value. Both read the format off the column rather than knowing
 * any report's fields, so the PDF and the table can never disagree about what a column means.
 */
export function formatCell(row: ReportRow, column: ReportColumn, currency: string): string {
    const value = row[column.key];
    if (value === null || value === undefined) return "";

    switch (column.format) {
        case "MONEY":
            return formatMoney(Number(value), currency);
        case "PERCENT":
            return formatPercent(Number(value));
        case "DATE":
            return formatDate(String(value));
        default:
            return String(value);
    }
}

/**
 * The totals row is a normal row with holes in it, plus a label. core-api puts a count there
 * ("5 customers", "4 categories"), and it belongs in the first column — every other cell in
 * that row is a number or blank.
 */
export function formatTotalCell(
    totals: ReportRow,
    column: ReportColumn,
    index: number,
    currency: string
): string {
    if (index === 0) return String(totals.label ?? "");

    return column.key in totals ? formatCell(totals, column, currency) : "";
}
