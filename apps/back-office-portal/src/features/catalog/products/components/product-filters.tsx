"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useCategoryOptions } from "../../categories/hooks/use-categories";
import { buildCategoryLookup, categorySlugFromId } from "../../categories/lib/category-lookup";
import { SEARCH_DEBOUNCE_MS } from "../lib/constants";
import type { ProductFilterPatch } from "../lib/search-params";
import type { ProductListParams, ProductStatus } from "../types/product";

/** <Select> cannot hold an empty-string value, so "all" stands in for "no filter". */
const ALL = "all";

type ProductFiltersProps = {
    readonly params: ProductListParams;
    readonly onChange: (patch: ProductFilterPatch) => void;
};

export function ProductFilters({ params, onChange }: ProductFiltersProps) {
    const t = useTranslations("Catalog");
    const { options, isLoading: isLoadingCategories } = useCategoryOptions();
    const { data: categories } = useCategories();
    // The <Select> works in ids (options carry them) while the URL works in slugs.
    const lookup = useMemo(() => buildCategoryLookup(categories ?? []), [categories]);
    const selectedId = params.categorySlug ? lookup.bySlug.get(params.categorySlug)?.id : undefined;
    const categoryItems = [
        { value: ALL, label: t("allCategories") },
        ...options.map((option) => ({ value: String(option.id), label: option.label }))
    ];
    const statusItems = [
        { value: ALL, label: t("activeAndInactive") },
        { value: "active", label: t("active") },
        { value: "inactive", label: t("inactive") },
        { value: "deleted", label: t("archived") }
    ];

    /*
     * The text input is the one piece of local state on this screen. It has to be: the URL
     * is only updated after the debounce, so binding the input straight to it would drop
     * characters typed within 300ms of each other. It re-syncs from the URL below so that
     * back/forward and a cleared filter still reach the input.
     */
    const [searchDraft, setSearchDraft] = useState(params.q ?? "");

    /*
     * Re-sync from the URL when it changes underneath us (back/forward, a cleared filter)
     * by adjusting state during render rather than in an effect. An effect here would set
     * state on every URL change and trigger a second render pass — React's documented
     * pattern for "adjust state when a prop changes" is exactly this comparison.
     */
    const [urlQuery, setUrlQuery] = useState(params.q ?? "");
    if (urlQuery !== (params.q ?? "")) {
        setUrlQuery(params.q ?? "");
        setSearchDraft(params.q ?? "");
    }

    useEffect(() => {
        const current = params.q ?? "";
        if (searchDraft === current) return;

        const timer = window.setTimeout(() => onChange({ q: searchDraft }), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchDraft, params.q, onChange]);

    const hasFilters = Boolean(params.q || params.categorySlug || params.status);

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
                <Label htmlFor="product-search">{t("search")}</Label>
                <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        id="product-search"
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="space-y-2 md:w-56">
                <Label htmlFor="product-category">{t("category")}</Label>
                <Select
                    items={categoryItems}
                    value={selectedId ? String(selectedId) : ALL}
                    onValueChange={(value) =>
                        onChange({
                            categorySlug: value === ALL ? null : (categorySlugFromId(lookup, Number(value)) ?? null)
                        })
                    }
                >
                    <SelectTrigger id="product-category" className="w-full">
                        <SelectValue placeholder={isLoadingCategories ? t("loading") : t("allCategories")} />
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

            <div className="space-y-2 md:w-44">
                <Label htmlFor="product-status">{t("status")}</Label>
                <Select
                    items={statusItems}
                    value={params.status ?? ALL}
                    onValueChange={(value) => onChange({ status: value === ALL ? null : (value as ProductStatus) })}
                >
                    <SelectTrigger id="product-status" className="w-full">
                        <SelectValue placeholder={t("activeAndInactive")} />
                    </SelectTrigger>
                    <SelectContent>
                        {/* "All" is not truly all: the API hides archived products unless
                            they are asked for by name, so they only appear under Archived. */}
                        {statusItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {hasFilters && (
                <Button
                    variant="ghost"
                    onClick={() => onChange({ q: null, categorySlug: null, status: null })}
                    className="md:mb-0.5"
                >
                    <X className="size-4" />
                    {t("clear")}
                </Button>
            )}
        </div>
    );
}
