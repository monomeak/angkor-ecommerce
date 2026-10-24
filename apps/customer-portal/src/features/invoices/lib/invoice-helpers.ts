import type { InvoiceStatus, PaymentMethod } from "../types/invoice";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
    ISSUED: "Awaiting payment",
    PARTIALLY_PAID: "Partly paid",
    PAID: "Paid",
    CANCELLED: "Cancelled"
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    QR_CODE: "KHQR",
    CARD: "Card",
    WALLET: "Wallet balance",
    OTHER: "Other"
};
