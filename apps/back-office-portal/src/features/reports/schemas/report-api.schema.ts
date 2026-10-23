import { z } from "zod";

/** Wire shape for `GET /reports/{invoices,sales-by-category}`, exactly as core-api serialises it. */

const reportCellSchema = z.union([z.string(), z.number(), z.null()]);

export const reportColumnDtoSchema = z.object({
    key: z.string(),
    label: z.string(),
    align: z.enum(["LEFT", "RIGHT"]),
    format: z.enum(["TEXT", "NUMBER", "MONEY", "PERCENT", "DATE"])
});

export const reportDtoSchema = z.object({
    reportType: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    basis: z.string(),
    currency: z.string(),
    generatedAt: z.string(),
    columns: z.array(reportColumnDtoSchema),
    rows: z.array(z.record(z.string(), reportCellSchema)),
    totals: z.record(z.string(), reportCellSchema)
});

export type ReportDto = z.infer<typeof reportDtoSchema>;
