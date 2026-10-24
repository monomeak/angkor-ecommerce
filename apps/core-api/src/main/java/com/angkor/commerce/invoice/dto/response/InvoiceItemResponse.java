package com.angkor.commerce.invoice.dto.response;

import java.math.BigDecimal;

public record InvoiceItemResponse(
    Long id,
    Integer lineNumber,
    Long productId,
    String sku,
    String title,
    String category, // root category at the sale; null on manual lines
    String description,
    String thumbnail, // resolved URL, not the object key
    String unit,
    BigDecimal price,
    Integer quantity,
    BigDecimal total,
    BigDecimal discountPercentage,
    BigDecimal discountedTotal
) {}
