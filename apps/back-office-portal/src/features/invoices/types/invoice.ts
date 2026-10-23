/**
 * Domain types for invoices, mapped from core-api's InvoiceResponse / InvoiceSummaryResponse.
 *
 * Two things worth knowing before reading these:
 *
 * 1. An invoice is only ever created by a confirmed payment (`CheckoutServiceImpl`) — the back
 *    office has no create endpoint. So this feature is read-and-print, not an invoice editor.
 * 2. The API has no "overdue" status. It stores ISSUED → PARTIALLY_PAID → PAID (or CANCELLED);
 *    overdue is derived at render time from dueDate and balance — see lib/invoice-display.ts.
 */
export type InvoiceStatus = "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

/** What a badge actually shows: the stored status, plus the derived one. */
export type InvoiceDisplayStatus = InvoiceStatus | "OVERDUE";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_CODE" | "CARD" | "WALLET" | "OTHER";
export type PaymentStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

export interface InvoiceItem {
    id: number;
    lineNumber: number | null;
    /** Null on the "Delivery" line the API adds when an order carried a shipping fee. */
    productId: number | null;
    sku: string | null;
    title: string;
    description: string | null;
    thumbnail: string | null;
    unit: string | null;
    price: number;
    quantity: number;
    total: number;
    discountPercentage: number;
    discountedTotal: number;
}

export interface InvoicePayment {
    id: number;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    /** STAFF for a payment typed in the back office, GATEWAY for one the checkout confirmed. */
    source: "STAFF" | "GATEWAY";
    paymentDate: string;
    referenceNumber: string | null;
}

export interface InvoiceCustomer {
    id: number;
    displayName: string | null;
    email: string | null;
    phone: string | null;
}

/** The full record behind `GET /invoices/{id}` — what the receipt prints. */
export interface Invoice {
    id: number;
    invoiceNumber: string;
    invoiceStatus: InvoiceStatus;
    orderId: number | null;
    customer: InvoiceCustomer;
    items: InvoiceItem[];
    payments: InvoicePayment[];
    issueDate: string;
    dueDate: string;
    subtotal: number;
    discountPercentage: number;
    discountAmount: number;
    taxPercentage: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    balance: number;
    currency: string;
    totalItems: number;
    totalQuantity: number;
    notes: string | null;
    issuedAt: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
}

/** A list row. No items or payments — only the money totals the API precomputes. */
export interface InvoiceSummary {
    id: number;
    invoiceNumber: string;
    invoiceStatus: InvoiceStatus;
    customerId: number;
    customerName: string;
    issueDate: string;
    dueDate: string;
    total: number;
    paidAmount: number;
    balance: number;
    currency: string;
}

export interface InvoiceListResult {
    invoices: InvoiceSummary[];
    total: number;
    skip: number;
    limit: number;
}

export type InvoiceSortField = "id" | "invoiceNumber" | "issueDate" | "dueDate" | "total" | "balance" | "createdAt";

export type SortOrder = "asc" | "desc";

export interface InvoiceListParams {
    search?: string;
    status?: InvoiceStatus;
    customerId?: number;
    /** ISO calendar dates (YYYY-MM-DD), inclusive on both ends. */
    issueDateFrom?: string;
    issueDateTo?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    sortBy: InvoiceSortField;
    order: SortOrder;
    skip: number;
    limit: number;
}
