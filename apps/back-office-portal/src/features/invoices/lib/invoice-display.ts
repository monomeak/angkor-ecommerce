import type { InvoiceDisplayStatus, InvoiceStatus, PaymentMethod } from "../types/invoice";

/**
 * core-api has no OVERDUE status — `InvoiceMapper` has a note about it and no implementation,
 * and the nightly job that would flip it does not exist. So it is derived here: an invoice is
 * overdue when money is still owed and the due date has passed. The stored status is left
 * alone, which is why this returns a *display* status rather than mutating the record.
 */
export function displayStatus(
    status: InvoiceStatus,
    dueDate: string,
    balance: number,
    today = new Date()
): InvoiceDisplayStatus {
    if (status === "PAID" || status === "CANCELLED" || balance <= 0) {
        return status;
    }

    // Both sides as YYYY-MM-DD: dueDate is a LocalDate, so comparing it as an instant would
    // make an invoice due today read as overdue for most of the day in Phnom Penh.
    return dueDate < toIsoDate(today) ? "OVERDUE" : status;
}

function toIsoDate(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(date);
}

/** Tailwind classes per display status. Mirrors the mock model's palette so the two screens match. */
export const STATUS_STYLES: Record<InvoiceDisplayStatus, string> = {
    PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    PARTIALLY_PAID: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    ISSUED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    OVERDUE: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    CANCELLED: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400"
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    QR_CODE: "KHQR",
    CARD: "Card",
    WALLET: "Wallet balance",
    OTHER: "Other"
};

/** The statuses the filter offers — OVERDUE is excluded because the API cannot filter on it. */
export const FILTERABLE_STATUSES: InvoiceStatus[] = ["ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"];
