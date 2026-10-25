package com.angkor.commerce.inventory;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.inventory.dto.request.InventoryQueryParams;
import com.angkor.commerce.inventory.dto.response.InventoryItemResponse;
import com.angkor.commerce.inventory.dto.response.InventorySummaryResponse;
import com.angkor.commerce.security.annotation.IsShopUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Kept off `/products`, whose GETs are public: stock levels across the shop are staff-only. */
@RestController
@RequestMapping(ApiConstants.INVENTORY_BASE)
@RequiredArgsConstructor
@Validated
@Tag(name = "Inventory (Back Office)")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/summary")
    @IsShopUser
    @Operation(summary = "Stock totals for the whole catalogue and per leaf category")
    public ResponseEntity<InventorySummaryResponse> getSummary(
        @RequestParam(defaultValue = "" + InventoryQueryParams.DEFAULT_THRESHOLD) @Min(0) @Max(1000) int threshold
    ) {
        return ResponseEntity.ok(inventoryService.getSummary(threshold));
    }

    @GetMapping("/items")
    @IsShopUser
    @Operation(summary = "Products with per-variant stock, neediest first; filter by category, stock level or name/SKU")
    public ResponseEntity<PageResponse<InventoryItemResponse>> getItems(@Valid InventoryQueryParams query) {
        return ResponseEntity.ok(inventoryService.getItems(query));
    }
}
