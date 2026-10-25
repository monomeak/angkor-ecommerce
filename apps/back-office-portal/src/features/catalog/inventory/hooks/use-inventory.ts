"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { LOW_STOCK_THRESHOLD } from "../../products/lib/constants";
import { fetchInventoryItems, fetchInventorySummary } from "../api/inventory-api";
import { inventoryKeys } from "../lib/query-keys";
import type { InventoryItemParams } from "../types/inventory";

/**
 * The threshold is sent rather than left to the API's default, so the inventory pages flag
 * exactly what the product list's stock cell does.
 */
export function useInventorySummary() {
    const { apiBaseUrl } = useAppConfig();

    return useQuery({
        queryKey: inventoryKeys.summary(LOW_STOCK_THRESHOLD),
        queryFn: () => fetchInventorySummary(apiBaseUrl, LOW_STOCK_THRESHOLD)
    });
}

export function useInventoryItems(params: InventoryItemParams) {
    const { apiBaseUrl } = useAppConfig();

    return useQuery({
        queryKey: inventoryKeys.items(params, LOW_STOCK_THRESHOLD),
        queryFn: () => fetchInventoryItems(apiBaseUrl, params, LOW_STOCK_THRESHOLD),
        placeholderData: keepPreviousData
    });
}
