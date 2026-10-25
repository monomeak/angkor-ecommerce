import { apiFetch, parseResponse } from "@/lib/api-client";
import { mapInventoryItemPage, mapInventorySummary } from "../mappers/inventory.mapper";
import { inventoryItemPageDtoSchema, inventorySummaryDtoSchema } from "../schemas/inventory-api.schema";
import type { InventoryItemPage, InventoryItemParams, InventorySummary } from "../types/inventory";

/** Staff-only, unlike `/products` whose GETs are public. The counting happens in SQL. */
const INVENTORY_BASE = "/inventory";

export async function fetchInventorySummary(apiBaseUrl: string, threshold: number): Promise<InventorySummary> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${INVENTORY_BASE}/summary?threshold=${threshold}`);

    return mapInventorySummary(parseResponse(inventorySummaryDtoSchema, data));
}

export async function fetchInventoryItems(
    apiBaseUrl: string,
    params: InventoryItemParams,
    threshold: number
): Promise<InventoryItemPage> {
    const search = new URLSearchParams({
        stock: params.stock,
        threshold: String(threshold),
        skip: String(params.skip),
        limit: String(params.limit)
    });
    if (params.categoryId) search.set("categoryId", String(params.categoryId));
    if (params.search) search.set("search", params.search);

    const data = await apiFetch<unknown>(apiBaseUrl, `${INVENTORY_BASE}/items?${search.toString()}`);

    return mapInventoryItemPage(parseResponse(inventoryItemPageDtoSchema, data));
}
