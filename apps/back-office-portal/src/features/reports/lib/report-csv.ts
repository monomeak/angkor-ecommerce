import { toCsv } from "@/src/shared/lib/csv-export";
import type { Report } from "../types/report";

/**
 * Built from the payload already on screen — exporting never costs a second request, so the
 * file cannot disagree with the table it came from.
 *
 * Raw numbers, not formatted ones: a spreadsheet has to be able to add up the column, and
 * "$1,083.50" is text. Formatting is the screen's job.
 */

/**
 * Excel shows these as junk rows, but they are the only thing that lets a downloaded file
 * explain itself a year later — which period, which basis, which currency.
 */
function metadataRows(report: Report): string {
    return [
        `# Angkor Commerce — ${report.title}`,
        `# period,${report.startDate},${report.endDate}`,
        `# basis,${report.basis} (paid invoices only)`,
        `# currency,${report.currency}`
    ].join("\n");
}

export function toReportCsv(report: Report): string {
    const headers = report.columns.map((column) => column.label);
    const rows = report.columns.length
        ? report.rows.map((row) => report.columns.map((column) => row[column.key] ?? ""))
        : [];

    const totals = report.columns.map((column, index) =>
        index === 0 ? (report.totals.label ?? "") : (report.totals[column.key] ?? "")
    );

    return `${metadataRows(report)}\n${toCsv(headers, [...rows, totals])}`;
}

/** Dated, because the next export covers a different period and must not overwrite this one. */
export function reportCsvFilename(report: Report): string {
    return `${report.reportType}_${report.startDate}_${report.endDate}.csv`;
}
