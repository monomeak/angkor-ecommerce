package com.angkor.commerce.inventory.dto.request;

import com.angkor.commerce.inventory.StockFilter;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record InventoryQueryParams(
    Long categoryId,
    StockFilter stock,
    @Size(max = 100) String search,
    @Min(0) @Max(1000) Integer threshold,
    @Min(0) Integer skip,
    @Min(1) @Max(100) Integer limit
) {
    public static final int DEFAULT_THRESHOLD = 10;
    private static final int DEFAULT_LIMIT = 20;

    public StockFilter stockOrDefault() {
        return stock == null ? StockFilter.ALL : stock;
    }

    public int thresholdOrDefault() {
        return threshold == null ? DEFAULT_THRESHOLD : threshold;
    }

    public int skipOrDefault() {
        return skip == null ? 0 : skip;
    }

    public int limitOrDefault() {
        return limit == null ? DEFAULT_LIMIT : limit;
    }

    /** Trimmed, or null for "no search". */
    public String searchOrNull() {
        return search == null || search.isBlank() ? null : search.trim();
    }
}
