"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEARCH_DEBOUNCE_MS } from "../lib/constants";
import { FILTERABLE_STATUSES } from "../lib/invoice-display";
import type { InvoiceFilterPatch } from "../lib/search-params";
import type { InvoiceListParams, InvoiceStatus } from "../types/invoice";

/** <Select> cannot hold an empty-string value, so "all" stands in for "no filter". */
const ALL = "all";

type InvoiceFiltersProps = {
    readonly params: InvoiceListParams;
    readonly onChange: (patch: InvoiceFilterPatch) => void;
};

export function InvoiceFilters({ params, onChange }: InvoiceFiltersProps) {
    const t = useTranslations("Invoices");

    /*
     * The text input is the one piece of local state here: the URL is only updated after the
     * debounce, so binding the input straight to it would drop characters typed within 300ms
     * of each other. The date inputs need no such treatment — they commit on pick.
     */
    const [searchDraft, setSearchDraft] = useState(params.search ?? "");

    // Re-sync from the URL when it changes underneath us (back/forward, cleared filters) by
    // adjusting state during render rather than in an effect.
    const [urlSearch, setUrlSearch] = useState(params.search ?? "");
    if (urlSearch !== (params.search ?? "")) {
        setUrlSearch(params.search ?? "");
        setSearchDraft(params.search ?? "");
    }

    useEffect(() => {
        const current = params.search ?? "";
        if (searchDraft === current) return;

        const timer = window.setTimeout(() => onChange({ search: searchDraft }), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchDraft, params.search, onChange]);

    const hasFilters = Boolean(
        params.search ||
            params.status ||
            params.customerId ||
            params.issueDateFrom ||
            params.issueDateTo ||
            params.dueDateFrom ||
            params.dueDateTo
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invoice-search">{t("search")}</Label>
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="invoice-search"
                            value={searchDraft}
                            onChange={(event) => setSearchDraft(event.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invoice-status">{t("status")}</Label>
                    <Select
                        items={[
                            { value: ALL, label: t("allStatuses") },
                            ...FILTERABLE_STATUSES.map((status) => ({ value: status, label: t(`status_${status}`) }))
                        ]}
                        value={params.status ?? ALL}
                        onValueChange={(value) => onChange({ status: value === ALL ? null : (value as InvoiceStatus) })}
                    >
                        <SelectTrigger id="invoice-status" className="w-full sm:w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
                            {FILTERABLE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {t(`status_${status}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Issued date only. The API also filters on the due date and the URL still
                    carries ?dueFrom=/?dueTo=, but staff look invoices up by when they were
                    issued — a second pair of date boxes was noise on the toolbar. */}
                <DateRange
                    idPrefix="issued"
                    label={t("issuedBetween")}
                    from={params.issueDateFrom}
                    to={params.issueDateTo}
                    onChange={(from, to) => onChange({ issueDateFrom: from, issueDateTo: to })}
                />

                {hasFilters && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            onChange({
                                search: null,
                                status: null,
                                customerId: null,
                                issueDateFrom: null,
                                issueDateTo: null,
                                dueDateFrom: null,
                                dueDateTo: null
                            })
                        }
                    >
                        <RotateCcw className="size-4" />
                        {t("clearFilters")}
                    </Button>
                )}
            </div>

            {/* Set by clicking a customer in the table; there is no picker for it. */}
            {params.customerId && (
                <p className="text-sm text-muted-foreground">
                    {t("filteredByCustomer", { id: params.customerId })}{" "}
                    <button
                        type="button"
                        className="text-foreground underline underline-offset-4"
                        onClick={() => onChange({ customerId: null })}
                    >
                        {t("showAllCustomers")}
                    </button>
                </p>
            )}
        </div>
    );
}

type DateRangeProps = {
    readonly idPrefix: string;
    readonly label: string;
    readonly from: string | undefined;
    readonly to: string | undefined;
    readonly onChange: (from: string | null, to: string | null) => void;
};

/** Two native date inputs — the API takes plain calendar dates, so no picker library is needed. */
function DateRange({ idPrefix, label, from, to, onChange }: DateRangeProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-from`}>{label}</Label>
            <div className="flex items-center gap-2">
                <Input
                    id={`${idPrefix}-from`}
                    type="date"
                    value={from ?? ""}
                    max={to}
                    className="w-40"
                    onChange={(event) => onChange(event.target.value || null, to ?? null)}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                    id={`${idPrefix}-to`}
                    type="date"
                    value={to ?? ""}
                    min={from}
                    className="w-40"
                    onChange={(event) => onChange(from ?? null, event.target.value || null)}
                />
            </div>
        </div>
    );
}
