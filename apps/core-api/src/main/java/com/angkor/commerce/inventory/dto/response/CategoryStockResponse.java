package com.angkor.commerce.inventory.dto.response;

/** One leaf category's stock. Variant counts, not unit counts, for low and out. */
public record CategoryStockResponse(
    Long categoryId,
    String name,
    String slug,
    String parentName,
    long products,
    long variants,
    long unitsInStock,
    long lowStockVariants,
    long outOfStockVariants,
    /** Products with at least one variant at or below the threshold. */
    long productsNeedingAttention
) {}
