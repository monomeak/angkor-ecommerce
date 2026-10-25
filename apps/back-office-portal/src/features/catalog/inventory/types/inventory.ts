import type { ProductStatus } from "../../products/types/product";

/** Judged per variant: out at 0, low at 1..threshold. */
export type StockLevel = "out" | "low" | "ok";

/** The details list's filter. `low` includes sold-out variants — both need restocking. */
export type StockFilter = "all" | "low" | "out";

export interface StockCounts {
    products: number;
    variants: number;
    unitsInStock: number;
    lowStockVariants: number;
    outOfStockVariants: number;
    productsNeedingAttention: number;
}

export interface CategoryStock extends StockCounts {
    categoryId: number;
    name: string;
    /** "Men · Shirt" — leaf names repeat across parents (three "Shoes"), so the parent is part of it. */
    label: string;
    slug: string;
    parentName: string | null;
}

export interface InventorySummary {
    threshold: number;
    totals: StockCounts;
    categories: CategoryStock[];
}

export interface VariantStock {
    id: number;
    size: string | null;
    sku: string;
    stock: number;
}

export interface InventoryItem {
    productId: number;
    name: string;
    status: ProductStatus;
    thumbnail: string | null;
    categoryLabel: string;
    totalStock: number;
    variants: VariantStock[];
}

export interface InventoryItemParams {
    categoryId?: number;
    stock: StockFilter;
    search?: string;
    skip: number;
    limit: number;
}

export interface InventoryItemPage {
    items: InventoryItem[];
    total: number;
}
