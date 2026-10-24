"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEARCH_DEBOUNCE_MS } from "../lib/constants";
import type { CustomerFilterPatch } from "../lib/search-params";
import type { CustomerListParams, CustomerStatus } from "../types/customer";

/** <Select> cannot hold an empty-string value, so "all" stands in for "no filter". */
const ALL = "all";

type CustomerFiltersProps = {
    readonly params: CustomerListParams;
    readonly onChange: (patch: CustomerFilterPatch) => void;
};

export function CustomerFilters({ params, onChange }: CustomerFiltersProps) {
    const t = useTranslations("Customers");
    const statusItems = [
        { value: ALL, label: t("activeAndInactive") },
        { value: "active", label: t("active") },
        { value: "inactive", label: t("inactive") },
        { value: "deleted", label: t("archived") }
    ];

    /*
     * The text input is the one piece of local state on this screen. It has to be: the URL is
     * only updated after the debounce, so binding the input straight to it would drop
     * characters typed within 300ms of each other.
     */
    const [searchDraft, setSearchDraft] = useState(params.search ?? "");

    /*
     * Re-sync from the URL when it changes underneath us (back/forward, a cleared filter) by
     * adjusting state during render rather than in an effect — React's documented pattern for
     * "adjust state when a prop changes".
     */
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

    const hasFilters = Boolean(params.search || params.status);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="customer-search">{t("search")}</Label>
                    <div className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="customer-search"
                            value={searchDraft}
                            onChange={(event) => setSearchDraft(event.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="customer-status">{t("status")}</Label>
                    <Select
                        items={statusItems}
                        value={params.status ?? ALL}
                        onValueChange={(value) =>
                            onChange({ status: value === ALL ? null : (value as CustomerStatus) })
                        }
                    >
                        <SelectTrigger id="customer-status" className="w-full sm:w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {statusItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {hasFilters && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onChange({ search: null, status: null })}
                >
                    <RotateCcw className="size-4" />
                    {t("clearFilters")}
                </Button>
            )}
        </div>
    );
}
