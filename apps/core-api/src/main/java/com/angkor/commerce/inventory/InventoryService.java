package com.angkor.commerce.inventory;

import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.inventory.dto.request.InventoryQueryParams;
import com.angkor.commerce.inventory.dto.response.InventoryItemResponse;
import com.angkor.commerce.inventory.dto.response.InventorySummaryResponse;

public interface InventoryService {
    InventorySummaryResponse getSummary(int threshold);

    PageResponse<InventoryItemResponse> getItems(InventoryQueryParams query);
}
