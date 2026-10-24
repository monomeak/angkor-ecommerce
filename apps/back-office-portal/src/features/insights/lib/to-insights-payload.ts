import type { Report } from "../../reports/types/report";
import type { InsightsRequestPayload } from "../types/insights";

/**
 * The one place the reports are stripped down for the AI. Both reports carry things a prompt
 * has no business seeing — the invoice report is one row per invoice, with customer names and,
 * for a super admin, phone numbers — so only the totals row crosses over from it.
 *
 * Everything here is a number the reader can also see on /reports for the same period.
 */

function toNumber(value: string | number | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function toInsightsPayload({
  periodLabel,
  locale,
  invoices,
  categories,
}: {
  periodLabel: string;
  locale: string;
  invoices: Report;
  categories: Report;
}): InsightsRequestPayload {
  return {
    periodLabel,
    startDate: invoices.startDate,
    endDate: invoices.endDate,
    currency: invoices.currency,
    locale,
    totals: {
      customers: toNumber(invoices.totals.customers),
      items: toNumber(invoices.totals.totalItems),
      discount: toNumber(invoices.totals.totalDiscount),
      revenue: toNumber(invoices.totals.total),
    },
    salesByCategory: categories.rows.map((row) => ({
      category: String(row.category ?? ""),
      unitsSold: toNumber(row.unitsSold),
      discount: toNumber(row.discount),
      revenue: toNumber(row.revenue),
      share: toNumber(row.share),
    })),
  };
}
