"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEARCH_DEBOUNCE_MS, STOCK_FILTERS, type InventoryFilterPatch } from "../lib/search-params";
import type { CategoryStock, InventoryItemParams } from "../types/inventory";

/** <Select> cannot hold an empty value, so "all" stands in for "every category". */
const ALL = "all";

type InventoryFiltersProps = {
    readonly params: InventoryItemParams;
    readonly categories: CategoryStock[];
    readonly onChange: (patch: InventoryFilterPatch) => void;
};

export function InventoryFilters({ params, categories, onChange }: InventoryFiltersProps) {
    const t = useTranslations("Inventory");
    const categoryItems = [
        { value: ALL, label: t("allCategories") },
        ...categories.map((category) => ({ value: String(category.categoryId), label: category.label }))
    ];

    // Same debounced-draft pattern as CustomerFilters: the URL only updates after the pause.
    const [searchDraft, setSearchDraft] = useState(params.search ?? "");
    const [urlSearch, setUrlSearch] = useState(params.search ?? "");
    if (urlSearch !== (params.search ?? "")) {
        setUrlSearch(params.search ?? "");
        setSearchDraft(params.search ?? "");
    }

    useEffect(() => {
        if (searchDraft === (params.search ?? "")) return;

        const timer = window.setTimeout(() => onChange({ search: searchDraft }), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchDraft, params.search, onChange]);

    const hasFilters = Boolean(params.search || params.categoryId || params.stock !== "all");

    return (
        <div className="flex flex-col gap-3">
            <div role="group" aria-label={t("stockFilter")} className="flex flex-wrap gap-2">
                {STOCK_FILTERS.map((filter) => (
                    <Button
                        key={filter}
                        size="sm"
                        variant={params.stock === filter ? "default" : "outline"}
                        aria-pressed={params.stock === filter}
                        onClick={() => onChange({ stock: filter })}
                    >
                        {t(`filter_${filter}`)}
                    </Button>
                ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="inventory-search">{t("search")}</Label>
                        <div className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="inventory-search"
                                value={searchDraft}
                                onChange={(event) => setSearchDraft(event.target.value)}
                                placeholder={t("searchPlaceholder")}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="inventory-category">{t("category")}</Label>
                        <Select
                            items={categoryItems}
                            value={params.categoryId ? String(params.categoryId) : ALL}
                            onValueChange={(value) => onChange({ categoryId: value === ALL ? null : Number(value) })}
                        >
                            <SelectTrigger id="inventory-category" className="w-full sm:w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categoryItems.map((item) => (
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
                        onClick={() => onChange({ search: null, categoryId: null, stock: "all" })}
                    >
                        <RotateCcw className="size-4" />
                        {t("clearFilters")}
                    </Button>
                )}
            </div>
        </div>
    );
}
