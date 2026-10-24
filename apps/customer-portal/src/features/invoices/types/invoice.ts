/**
 * An invoice is the storefront's receipt: core-api issues exactly one when a payment is
 * confirmed (`CheckoutServiceImpl.confirmPayment`), so an order has none until it is paid.
 *
 * Invoices have no shipping-fee column, so an order's delivery charge arrives as an ordinary
 * line with a null `productId`.
 */
export type InvoiceStatus = "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_CODE" | "CARD" | "WALLET" | "OTHER";
export type PaymentStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

export type InvoiceItem = {
    id: number;
    lineNumber: number | null;
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
};

export type InvoicePayment = {
    id: number;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    source: "STAFF" | "GATEWAY";
    paymentDate: string;
    referenceNumber: string | null;
};

export type Invoice = {
    id: number;
    invoiceNumber: string;
    invoiceStatus: InvoiceStatus;
    orderId: number | null;
    customer: { id: number; displayName: string | null; email: string | null; phone: string | null };
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
};
