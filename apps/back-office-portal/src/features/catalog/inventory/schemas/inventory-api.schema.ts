import { z } from "zod";

import { recordStatusSchema } from "../../products/schemas/product-api.schema";

export const categoryStockDtoSchema = z.object({
    categoryId: z.number(),
    name: z.string(),
    slug: z.string(),
    parentName: z.string().nullable(),
    products: z.number(),
    variants: z.number(),
    unitsInStock: z.number(),
    lowStockVariants: z.number(),
    outOfStockVariants: z.number(),
    productsNeedingAttention: z.number()
});

/** `GET /inventory/summary` */
export const inventorySummaryDtoSchema = z.object({
    threshold: z.number(),
    totals: z.object({
        products: z.number(),
        variants: z.number(),
        unitsInStock: z.number(),
        lowStockVariants: z.number(),
        outOfStockVariants: z.number(),
        productsNeedingAttention: z.number()
    }),
    categories: z.array(categoryStockDtoSchema)
});

export const inventoryItemDtoSchema = z.object({
    productId: z.number(),
    name: z.string(),
    status: recordStatusSchema,
    thumbnail: z.string().nullable(),
    categoryId: z.number(),
    categoryName: z.string(),
    parentCategoryName: z.string().nullable(),
    totalStock: z.number(),
    variants: z.array(
        z.object({
            id: z.number(),
            /** Null for a product with no size concept. */
            size: z.string().nullable(),
            sku: z.string(),
            stock: z.number()
        })
    )
});

/** `GET /inventory/items` — PageResponse keyed `inventory`. */
export const inventoryItemPageDtoSchema = z.object({
    inventory: z.array(inventoryItemDtoSchema),
    total: z.number(),
    skip: z.number(),
    limit: z.number()
});

export type InventorySummaryDto = z.infer<typeof inventorySummaryDtoSchema>;
export type InventoryItemPageDto = z.infer<typeof inventoryItemPageDtoSchema>;
