package com.angkor.commerce.inventory.dto.response;

import com.angkor.commerce.common.enums.RecordStatus;
import java.util.List;

/** A product with every variant's stock, so the list can mark the exact sizes running out. */
public record InventoryItemResponse(
    Long productId,
    String name,
    RecordStatus status,
    String thumbnail,
    Long categoryId,
    String categoryName,
    String parentCategoryName,
    long totalStock,
    List<VariantStockResponse> variants
) {}
