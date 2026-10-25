package com.angkor.commerce.inventory.dto.response;

public record InventoryTotalsResponse(
    long products,
    long variants,
    long unitsInStock,
    long lowStockVariants,
    long outOfStockVariants,
    long productsNeedingAttention
) {}
