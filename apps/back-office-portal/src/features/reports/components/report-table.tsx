"use client";

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCell, formatTotalCell } from "../lib/report-cells";
import type { Report } from "../types/report";

/**
 * Knows nothing about either report. It loops `columns` for the header and reads each row by
 * `column.key` — the same contract the jsreport template follows, so a new report added on the
 * backend renders here without a line changing.
 */
type ReportTableProps = {
    readonly report: Report;
    readonly emptyMessage: string;
};

export function ReportTable({ report, emptyMessage }: ReportTableProps) {
    const { columns, rows, totals, currency } = report;

    if (rows.length === 0) {
        return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
    }

    return (
        // Reports are wide and the page must never scroll sideways, so the table scrolls itself.
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.key} className={cn(column.align === "RIGHT" && "text-right")}>
                                {column.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {rows.map((row, rowIndex) => (
                        <TableRow key={String(row[columns[0].key] ?? rowIndex)}>
                            {columns.map((column) => (
                                <TableCell
                                    key={column.key}
                                    className={cn(
                                        column.align === "RIGHT" && "text-right tabular-nums",
                                        column.format === "TEXT" && "font-medium"
                                    )}
                                >
                                    {formatCell(row, column, currency)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>

                <TableFooter>
                    <TableRow>
                        {columns.map((column, index) => (
                            <TableCell
                                key={column.key}
                                className={cn("font-semibold", column.align === "RIGHT" && "text-right tabular-nums")}
                            >
                                {formatTotalCell(totals, column, index, currency)}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
}
