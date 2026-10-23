import { apiFetch, apiFetchFile, parseResponse, type DownloadedFile } from "@/lib/api-client";
import { mapInvoice, mapInvoiceList } from "../mappers/invoice.mapper";
import { invoiceDtoSchema, invoiceListDtoSchema } from "../schemas/invoice-api.schema";
import type { Invoice, InvoiceListParams, InvoiceListResult } from "../types/invoice";

/*
 * The only place invoices talk HTTP. Both endpoints are @IsAdmin in core-api, so a staff
 * session is required and an expired one is refreshed once inside apiFetch.
 *
 * There is no create, update or delete here on purpose: core-api issues an invoice only when
 * a payment is confirmed, and the back office has no endpoint to make one by hand.
 */

const INVOICES_BASE = "/invoices";

/**
 * Empty values are dropped rather than sent blank: `?status=` fails enum conversion with a
 * 400 rather than being read as "no filter", and the same goes for the LocalDate params.
 */
function toSearchParams(params: InvoiceListParams): string {
    const search = new URLSearchParams();

    search.set("skip", String(params.skip));
    search.set("limit", String(params.limit));
    search.set("sortBy", params.sortBy);
    search.set("order", params.order);

    if (params.search) search.set("search", params.search);
    if (params.status) search.set("status", params.status);
    if (params.customerId !== undefined) search.set("customerId", String(params.customerId));
    if (params.issueDateFrom) search.set("issueDateFrom", params.issueDateFrom);
    if (params.issueDateTo) search.set("issueDateTo", params.issueDateTo);
    if (params.dueDateFrom) search.set("dueDateFrom", params.dueDateFrom);
    if (params.dueDateTo) search.set("dueDateTo", params.dueDateTo);

    return search.toString();
}

export async function fetchInvoices(apiBaseUrl: string, params: InvoiceListParams): Promise<InvoiceListResult> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${INVOICES_BASE}?${toSearchParams(params)}`);

    return mapInvoiceList(parseResponse(invoiceListDtoSchema, data));
}

export async function fetchInvoice(apiBaseUrl: string, invoiceId: number): Promise<Invoice> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${INVOICES_BASE}/${invoiceId}`);

    return mapInvoice(parseResponse(invoiceDtoSchema, data));
}

export function fetchInvoicePdf(apiBaseUrl: string, invoiceId: number): Promise<DownloadedFile> {
    return apiFetchFile(apiBaseUrl, `${INVOICES_BASE}/${invoiceId}/pdf`, "application/pdf");
}
