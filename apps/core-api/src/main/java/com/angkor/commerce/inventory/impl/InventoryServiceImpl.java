package com.angkor.commerce.inventory.impl;

import com.angkor.commerce.common.CollectionKeys;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.inventory.InventoryQueries;
import com.angkor.commerce.inventory.InventoryQueries.ProductStockRow;
import com.angkor.commerce.inventory.InventoryService;
import com.angkor.commerce.inventory.dto.request.InventoryQueryParams;
import com.angkor.commerce.inventory.dto.response.CategoryStockResponse;
import com.angkor.commerce.inventory.dto.response.InventoryItemResponse;
import com.angkor.commerce.inventory.dto.response.InventorySummaryResponse;
import com.angkor.commerce.inventory.dto.response.InventoryTotalsResponse;
import com.angkor.commerce.inventory.dto.response.VariantStockResponse;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    private final InventoryQueries queries;

    @Override
    public InventorySummaryResponse getSummary(int threshold) {
        List<CategoryStockResponse> categories = queries.categoryStock(threshold);

        // A product sits in exactly one category, so summing the rows double-counts nothing.
        InventoryTotalsResponse totals = new InventoryTotalsResponse(
            categories.stream().mapToLong(CategoryStockResponse::products).sum(),
            categories.stream().mapToLong(CategoryStockResponse::variants).sum(),
            categories.stream().mapToLong(CategoryStockResponse::unitsInStock).sum(),
            categories.stream().mapToLong(CategoryStockResponse::lowStockVariants).sum(),
            categories.stream().mapToLong(CategoryStockResponse::outOfStockVariants).sum(),
            categories.stream().mapToLong(CategoryStockResponse::productsNeedingAttention).sum()
        );

        return new InventorySummaryResponse(threshold, totals, categories);
    }

    @Override
    public PageResponse<InventoryItemResponse> getItems(InventoryQueryParams query) {
        List<ProductStockRow> rows = queries.productPage(query);
        Map<Long, List<VariantStockResponse>> variants = queries.variantsFor(
            rows.stream().map(ProductStockRow::productId).toList()
        );

        List<InventoryItemResponse> items = rows
            .stream()
            .map(row ->
                new InventoryItemResponse(
                    row.productId(),
                    row.name(),
                    row.status(),
                    row.thumbnail(),
                    row.categoryId(),
                    row.categoryName(),
                    row.parentCategoryName(),
                    row.totalStock(),
                    variants.getOrDefault(row.productId(), List.of())
                )
            )
            .toList();

        return PageResponse.of(
            CollectionKeys.INVENTORY,
            items,
            queries.countProducts(query),
            query.skipOrDefault(),
            query.limitOrDefault()
        );
    }
}
