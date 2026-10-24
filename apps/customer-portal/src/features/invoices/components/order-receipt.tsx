"use client";

import { FileText, Loader2, Printer } from "lucide-react";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/date";
import { formatPrice } from "@/src/features/products/lib/pricing";
import { useInvoicePdf } from "../hooks/use-invoice-pdf";
import { INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "../lib/invoice-helpers";
import type { Invoice } from "../types/invoice";

/**
 * The receipt as core-api issued it — every number is the invoice's own, none recomputed
 * here. `data-print-region` is what the print rules in globals.css keep on the page.
 */
export function OrderReceipt({ invoice }: { readonly invoice: Invoice }) {
    const { locale, timezone } = useAppConfig();
    const money = (amount: number) => formatPrice(amount, invoice.currency, locale);
    const pdf = useInvoicePdf();

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-end gap-2 print:hidden">
                {/* Disabled while in flight: a render takes a few hundred ms, and a double-click renders twice. */}
                <Button variant="outline" size="sm" onClick={() => pdf.mutate(invoice)} disabled={pdf.isPending}>
                    {pdf.isPending ? (
                        <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
                    ) : (
                        <FileText data-icon="inline-start" className="size-4" />
                    )}
                    {pdf.isPending ? "Preparing PDF…" : "Download PDF"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer data-icon="inline-start" className="size-4" />
                    Print receipt
                </Button>
            </div>
            {pdf.isError && (
                <p className="text-right text-sm text-destructive print:hidden">
                    {pdf.error instanceof ApiError
                        ? pdf.error.displayMessage
                        : "We couldn't generate the PDF. Please try again."}
                </p>
            )}

            <div data-print-region className="rounded-2xl border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                    <div>
                        <p className="text-lg font-semibold">Receipt {invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                            Issued {formatDate(invoice.issueDate, locale, timezone)}
                        </p>
                    </div>
                    <div className="text-right text-sm">
                        <p className="font-medium">{INVOICE_STATUS_LABEL[invoice.invoiceStatus]}</p>
                        <p className="text-muted-foreground">{invoice.customer.displayName}</p>
                        {invoice.customer.email && (
                            <p className="text-muted-foreground">{invoice.customer.email}</p>
                        )}
                    </div>
                </div>

                <ul className="flex flex-col gap-2 py-4">
                    {invoice.items.map((item) => (
                        <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
                            <span>
                                {item.title}
                                <span className="text-muted-foreground">
                                    {" "}
                                    × {item.quantity} @ {money(item.price)}
                                </span>
                            </span>
                            <span className="shrink-0 font-medium">{money(item.discountedTotal)}</span>
                        </li>
                    ))}
                </ul>

                <dl className="flex flex-col gap-1 border-t py-4 text-sm">
                    <ReceiptRow label="Subtotal" value={money(invoice.subtotal)} />
                    {invoice.discountAmount > 0 && (
                        <ReceiptRow label="Discount" value={`− ${money(invoice.discountAmount)}`} />
                    )}
                    {invoice.taxAmount > 0 && <ReceiptRow label="Tax" value={money(invoice.taxAmount)} />}
                    <ReceiptRow label="Total" value={money(invoice.total)} emphasis />
                    <ReceiptRow label="Paid" value={money(invoice.paidAmount)} />
                    {invoice.balance > 0 && <ReceiptRow label="Balance due" value={money(invoice.balance)} emphasis />}
                </dl>

                {invoice.payments.length > 0 && (
                    <div className="border-t pt-4">
                        <p className="text-sm font-medium">Payments</p>
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                            {invoice.payments.map((payment) => (
                                <li key={payment.id} className="flex flex-wrap justify-between gap-2">
                                    <span>
                                        {PAYMENT_METHOD_LABEL[payment.paymentMethod]} ·{" "}
                                        {formatDate(payment.paymentDate, locale, timezone)}
                                        {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
                                    </span>
                                    <span className="font-medium text-foreground">{money(payment.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

type ReceiptRowProps = {
    readonly label: string;
    readonly value: string;
    readonly emphasis?: boolean;
};

function ReceiptRow({ label, value, emphasis }: ReceiptRowProps) {
    return (
        <div
            className={
                emphasis
                    ? "flex items-center justify-between font-semibold text-foreground"
                    : "flex items-center justify-between text-muted-foreground"
            }
        >
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}
