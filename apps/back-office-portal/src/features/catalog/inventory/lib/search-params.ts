import type { InventoryItemParams, StockFilter } from "../types/inventory";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
/** Matches core-api's InventoryQueryParams default. */
export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
export const STOCK_FILTERS: StockFilter[] = ["all", "low", "out"];
export const SEARCH_DEBOUNCE_MS = 300;

function parsePositiveInt(value: string | null): number | undefined {
    if (!value) return undefined;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** A hand-edited URL is untrusted input: anything unrecognised falls back to the default. */
export function parseInventorySearchParams(params: URLSearchParams): InventoryItemParams {
    const stock = params.get("stock") as StockFilter | null;
    const limit = Math.min(parsePositiveInt(params.get("limit")) ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const page = parsePositiveInt(params.get("page")) ?? 1;

    return {
        categoryId: parsePositiveInt(params.get("category")),
        stock: stock && STOCK_FILTERS.includes(stock) ? stock : "all",
        search: params.get("search")?.trim() || undefined,
        skip: (page - 1) * limit,
        limit
    };
}

export function getCurrentPage(params: InventoryItemParams): number {
    return Math.floor(params.skip / params.limit) + 1;
}

export type InventoryFilterPatch = {
    categoryId?: number | null;
    stock?: StockFilter;
    search?: string | null;
    limit?: number;
    page?: number;
};

/** Builds a details-page link, e.g. from a summary row. */
export function inventoryDetailsHref(patch: Pick<InventoryFilterPatch, "categoryId" | "stock"> = {}): string {
    const query = buildInventorySearchParams(new URLSearchParams(), patch).toString();
    return query ? `/catalog/inventory/details?${query}` : "/catalog/inventory/details";
}

/** Defaults are dropped from the URL, and anything but paging goes back to page 1. */
export function buildInventorySearchParams(current: URLSearchParams, patch: InventoryFilterPatch): URLSearchParams {
    const next = new URLSearchParams(current.toString());

    const setOrDelete = (key: string, value: string | null | undefined) => {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
    };

    if ("categoryId" in patch) setOrDelete("category", patch.categoryId ? String(patch.categoryId) : null);
    if ("stock" in patch) setOrDelete("stock", patch.stock === "all" ? null : patch.stock);
    if ("search" in patch) setOrDelete("search", patch.search?.trim() || null);
    if ("limit" in patch) setOrDelete("limit", patch.limit === DEFAULT_PAGE_SIZE ? null : String(patch.limit));

    const isPagingOnly = Object.keys(patch).length === 1 && "page" in patch;
    const page = isPagingOnly ? patch.page : 1;
    setOrDelete("page", page && page > 1 ? String(page) : null);

    return next;
}
