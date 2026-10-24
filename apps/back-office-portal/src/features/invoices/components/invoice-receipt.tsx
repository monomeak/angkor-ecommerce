"use client";

import { useTranslations } from "next-intl";
import { FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, formatPercent } from "@/lib/formatters";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { useInvoicePdf } from "../hooks/use-invoice-pdf";
import { PAYMENT_METHOD_LABELS } from "../lib/invoice-display";
import type { Invoice } from "../types/invoice";

/**
 * The receipt as core-api issued it — every number is the invoice's own, none recomputed here.
 * `data-print-region` is what the print rules in app/globals.css keep on the page, so the
 * sidebar, header and toolbar drop away and the document prints on its own.
 */
export function InvoiceReceipt({ invoice }: { readonly invoice: Invoice }) {
    const t = useTranslations("Invoices");
    const money = (amount: number) => formatMoney(amount, invoice.currency);
    const pdf = useInvoicePdf();

    const handlePdf = () => {
        pdf.mutate(invoice, {
            onError: (error) => toast.error(error instanceof ApiError ? error.displayMessage : t("pdfError"))
        });
    };

    const statusLabels: Record<string, string> = {
        ISSUED: t("status_ISSUED"),
        PARTIALLY_PAID: t("status_PARTIALLY_PAID"),
        PAID: t("status_PAID"),
        CANCELLED: t("status_CANCELLED"),
        OVERDUE: t("status_OVERDUE")
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePdf} disabled={pdf.isPending}>
                    {pdf.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    {pdf.isPending ? t("pdfPending") : t("downloadPdf")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="size-4" />
                    {t("print")}
                </Button>
            </div>

            <div data-print-region className="rounded-lg border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                        <p className="text-xl font-semibold">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                            {t("issuedOn", { date: formatDate(invoice.issueDate) })} ·{" "}
                            {t("dueOn", { date: formatDate(invoice.dueDate) })}
                        </p>
                        {invoice.orderId && (
                            <p className="text-sm text-muted-foreground">
                                {t("fromOrder", { id: invoice.orderId })}
                            </p>
                        )}
                    </div>
                    <div className="space-y-1 text-right text-sm">
                        <InvoiceStatusBadge
                            status={invoice.invoiceStatus}
                            dueDate={invoice.dueDate}
                            balance={invoice.balance}
                            labels={statusLabels}
                        />
                        <p className="font-medium">{invoice.customer.displayName}</p>
                        {invoice.customer.email && <p className="text-muted-foreground">{invoice.customer.email}</p>}
                        {invoice.customer.phone && <p className="text-muted-foreground">{invoice.customer.phone}</p>}
                    </div>
                </div>

                <table className="mt-4 w-full text-sm">
                    <thead>
                        <tr className="text-left text-muted-foreground">
                            <th className="pb-2 font-medium">{t("colItem")}</th>
                            <th className="pb-2 text-right font-medium">{t("colUnitPrice")}</th>
                            <th className="pb-2 text-right font-medium">{t("colQty")}</th>
                            <th className="pb-2 text-right font-medium">{t("colLineTotal")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item) => (
                            <tr key={item.id} className="border-t">
                                <td className="py-2">
                                    <span className="font-medium">{item.title}</span>
                                    {item.sku && <span className="block text-xs text-muted-foreground">{item.sku}</span>}
                                </td>
                                <td className="py-2 text-right">{money(item.price)}</td>
                                <td className="py-2 text-right">{item.quantity}</td>
                                <td className="py-2 text-right font-medium">{money(item.discountedTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <dl className="mt-4 flex flex-col gap-1 border-t pt-4 text-sm">
                    <ReceiptRow label={t("subtotal")} value={money(invoice.subtotal)} />
                    {invoice.discountAmount > 0 && (
                        <ReceiptRow
                            label={`${t("discount")} (${formatPercent(invoice.discountPercentage)})`}
                            value={`− ${money(invoice.discountAmount)}`}
                        />
                    )}
                    {invoice.taxAmount > 0 && (
                        <ReceiptRow
                            label={`${t("tax")} (${formatPercent(invoice.taxPercentage)})`}
                            value={money(invoice.taxAmount)}
                        />
                    )}
                    <ReceiptRow label={t("total")} value={money(invoice.total)} emphasis />
                    <ReceiptRow label={t("paid")} value={money(invoice.paidAmount)} />
                    {invoice.balance > 0 && <ReceiptRow label={t("balanceDue")} value={money(invoice.balance)} emphasis />}
                </dl>

                <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium">{t("payments")}</p>
                    {invoice.payments.length === 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground">{t("noPayments")}</p>
                    ) : (
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                            {invoice.payments.map((payment) => (
                                <li key={payment.id} className="flex flex-wrap justify-between gap-2">
                                    <span>
                                        {PAYMENT_METHOD_LABELS[payment.paymentMethod]} ·{" "}
                                        {formatDate(payment.paymentDate)}
                                        {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
                                        {/* A voided payment stays on the record; it just stopped counting. */}
                                        {payment.paymentStatus !== "COMPLETED"
                                            ? ` · ${t(`payment_${payment.paymentStatus}`)}`
                                            : ""}
                                    </span>
                                    <span className="font-medium text-foreground">{money(payment.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {invoice.notes && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{invoice.notes}</p>}

                {invoice.cancelledAt && (
                    <p className="mt-4 border-t pt-4 text-sm text-destructive">
                        {t("cancelledOn", { date: formatDate(invoice.cancelledAt) })}
                        {invoice.cancellationReason ? ` — ${invoice.cancellationReason}` : ""}
                    </p>
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
