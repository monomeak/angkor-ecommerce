import { ApiError, apiFetch, apiFetchFile, parseResponse, type DownloadedFile } from "@/lib/api-client";
import { mapInvoice } from "../mappers/invoice.mapper";
import { invoiceDtoSchema } from "../schemas/invoice-api.schema";
import type { Invoice } from "../types/invoice";

/**
 * The receipt is reached through its order rather than through `/storefront/invoices`: the
 * invoice list rows carry no orderId, so an order screen has nothing to match on.
 *
 * A 404 is the normal state of an unpaid order, not a failure — hence null rather than a throw.
 */
export async function fetchOrderInvoice(apiBaseUrl: string, orderId: number): Promise<Invoice | null> {
    try {
        const data = await apiFetch<unknown>(apiBaseUrl, `/storefront/orders/${orderId}/invoice`);

        return mapInvoice(parseResponse(invoiceDtoSchema, data));
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}

/** Scoped by the session server-side: another customer's invoice id is a 404, not their PDF. */
export function fetchInvoicePdf(apiBaseUrl: string, invoiceId: number): Promise<DownloadedFile> {
    return apiFetchFile(apiBaseUrl, `/storefront/invoices/${invoiceId}/pdf`, "application/pdf");
}
