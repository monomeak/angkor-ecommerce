/**
 * What the analytics page sends to the AI route. Deliberately aggregates only — no invoice
 * numbers, no customer names, no phone numbers. The reports the numbers come from carry all
 * three, and none of it belongs in a third-party prompt.
 */

export interface CategorySalesPayload {
  category: string;
  unitsSold: number;
  discount: number;
  revenue: number;
  /** Percent of the period's revenue, 0–100. */
  share: number;
}

export interface PeriodTotalsPayload {
  /** Distinct customers who paid in the period. */
  customers: number;
  items: number;
  discount: number;
  revenue: number;
}

export interface InsightsRequestPayload {
  periodLabel: string;
  /** Resolved server-side, so the AI can name the range instead of guessing at "last 3 months". */
  startDate: string;
  endDate: string;
  currency: string;
  locale: string;
  totals: PeriodTotalsPayload;
  salesByCategory: CategorySalesPayload[];
}

export interface InsightsResult {
  insight: string;
}
