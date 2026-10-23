import { z } from "zod";

/**
 * Wire shapes for `/invoices`, exactly as core-api serialises them. These enums carry no
 * @JsonValue, so unlike a product's `status` they stay UPPERCASE on the wire.
 */
export const invoiceStatusSchema = z.enum(["ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"]);
export const paymentMethodSchema = z.enum(["CASH", "BANK_TRANSFER", "QR_CODE", "CARD", "WALLET", "OTHER"]);
export const paymentStatusSchema = z.enum(["COMPLETED", "VOIDED", "REFUNDED"]);
export const paymentSourceSchema = z.enum(["STAFF", "GATEWAY"]);

export const invoiceItemDtoSchema = z.object({
    id: z.number(),
    lineNumber: z.number().nullable(),
    productId: z.number().nullable(),
    sku: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    /** Already a resolved URL — InvoiceMapper runs it through ImageStorageService. */
    thumbnail: z.string().nullable(),
    unit: z.string().nullable(),
    price: z.number(),
    quantity: z.number(),
    total: z.number(),
    discountPercentage: z.number(),
    discountedTotal: z.number()
});

export const paymentSummaryDtoSchema = z.object({
    id: z.number(),
    amount: z.number(),
    paymentMethod: paymentMethodSchema,
    paymentStatus: paymentStatusSchema,
    source: paymentSourceSchema,
    /** A LocalDate — "2026-09-02", not an instant. */
    paymentDate: z.string(),
    referenceNumber: z.string().nullable()
});

export const invoiceDtoSchema = z.object({
    id: z.number(),
    invoiceNumber: z.string(),
    invoiceStatus: invoiceStatusSchema,
    orderId: z.number().nullable(),
    customer: z.object({
        id: z.number(),
        displayName: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable()
    }),
    items: z.array(invoiceItemDtoSchema),
    payments: z.array(paymentSummaryDtoSchema),
    issueDate: z.string(),
    dueDate: z.string(),
    subtotal: z.number(),
    discountPercentage: z.number(),
    discountAmount: z.number(),
    taxPercentage: z.number(),
    taxAmount: z.number(),
    total: z.number(),
    paidAmount: z.number(),
    balance: z.number(),
    currency: z.string(),
    totalItems: z.number(),
    totalQuantity: z.number(),
    notes: z.string().nullable(),
    issuedAt: z.string().nullable(),
    cancelledAt: z.string().nullable(),
    cancellationReason: z.string().nullable()
});

export const invoiceSummaryDtoSchema = z.object({
    id: z.number(),
    invoiceNumber: z.string(),
    invoiceStatus: invoiceStatusSchema,
    customerId: z.number(),
    customerName: z.string().nullable(),
    issueDate: z.string(),
    dueDate: z.string(),
    total: z.number(),
    paidAmount: z.number(),
    balance: z.number(),
    currency: z.string()
});

/** PageResponse<T> names the rows after the resource. */
export const invoiceListDtoSchema = z.object({
    invoices: z.array(invoiceSummaryDtoSchema),
    total: z.number(),
    skip: z.number(),
    limit: z.number()
});

export type InvoiceDto = z.infer<typeof invoiceDtoSchema>;
export type InvoiceSummaryDto = z.infer<typeof invoiceSummaryDtoSchema>;
export type InvoiceListDto = z.infer<typeof invoiceListDtoSchema>;
