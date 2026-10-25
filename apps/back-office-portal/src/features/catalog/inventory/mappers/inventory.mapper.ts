import type { InventoryItemPageDto, InventorySummaryDto } from "../schemas/inventory-api.schema";
import type { InventoryItemPage, InventorySummary } from "../types/inventory";

function categoryLabel(name: string, parentName: string | null): string {
    return parentName ? `${parentName} · ${name}` : name;
}

export function mapInventorySummary(dto: InventorySummaryDto): InventorySummary {
    return {
        threshold: dto.threshold,
        totals: dto.totals,
        categories: dto.categories.map((category) => ({
            ...category,
            label: categoryLabel(category.name, category.parentName)
        }))
    };
}

export function mapInventoryItemPage(dto: InventoryItemPageDto): InventoryItemPage {
    return {
        total: dto.total,
        items: dto.inventory.map((item) => ({
            productId: item.productId,
            name: item.name,
            status: item.status,
            thumbnail: item.thumbnail,
            categoryLabel: categoryLabel(item.categoryName, item.parentCategoryName),
            totalStock: item.totalStock,
            variants: item.variants
        }))
    };
}
