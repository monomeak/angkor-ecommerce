package com.angkor.commerce.inventory.dto.response;

import java.util.List;

/** {@code threshold} is echoed so the screen states the rule its numbers were counted with. */
public record InventorySummaryResponse(
    int threshold,
    InventoryTotalsResponse totals,
    List<CategoryStockResponse> categories
) {}
