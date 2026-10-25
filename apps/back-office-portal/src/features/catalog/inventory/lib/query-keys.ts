import type { InventoryItemParams } from "../types/inventory";

export const inventoryKeys = {
    all: ["inventory"] as const,
    summary: (threshold: number) => [...inventoryKeys.all, "summary", threshold] as const,
    items: (params: InventoryItemParams, threshold: number) =>
        [...inventoryKeys.all, "items", threshold, params] as const
};
