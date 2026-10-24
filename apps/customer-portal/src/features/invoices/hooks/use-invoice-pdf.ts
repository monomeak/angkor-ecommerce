"use client";

import { useMutation } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { saveFile } from "@/lib/download-file";
import { fetchInvoicePdf } from "../api/invoice-api";
import type { Invoice } from "../types/invoice";

/** A mutation, not a query: each click is a fresh render, and nothing should cache a PDF blob. */
export function useInvoicePdf() {
    const { apiBaseUrl } = useAppConfig();

    return useMutation({
        mutationFn: (invoice: Invoice) => fetchInvoicePdf(apiBaseUrl, invoice.id),
        onSuccess: ({ blob, filename }, invoice) => saveFile(filename ?? `${invoice.invoiceNumber}.pdf`, blob)
    });
}
