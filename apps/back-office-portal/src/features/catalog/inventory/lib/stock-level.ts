import type { StockLevel } from "../types/inventory";

/** The client twin of InventoryQueries' rule, so a chip and the server's counts agree. */
export function stockLevel(stock: number, threshold: number): StockLevel {
    if (stock <= 0) return "out";
    if (stock <= threshold) return "low";
    return "ok";
}
