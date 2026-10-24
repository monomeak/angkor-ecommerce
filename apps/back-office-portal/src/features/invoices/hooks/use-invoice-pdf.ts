"use client";

import { useMutation } from "@tanstack/react-query";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { saveFile } from "@/src/shared/lib/download-file";
import { fetchInvoicePdf } from "../api/invoice-api";
import type { Invoice } from "../types/invoice";

export function useInvoicePdf() {
    const { apiBaseUrl } = useAppConfig();

    return useMutation({
        mutationFn: (invoice: Invoice) => fetchInvoicePdf(apiBaseUrl, invoice.id),
        onSuccess: ({ blob, filename }, invoice) => saveFile(filename ?? `${invoice.invoiceNumber}.pdf`, blob)
    });
}
