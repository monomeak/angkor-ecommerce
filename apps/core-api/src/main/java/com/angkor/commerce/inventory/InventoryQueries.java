package com.angkor.commerce.inventory;

import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.inventory.dto.request.InventoryQueryParams;
import com.angkor.commerce.inventory.dto.response.CategoryStockResponse;
import com.angkor.commerce.inventory.dto.response.VariantStockResponse;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Native SQL over products, product_variants and categories, for the same reason as
 * {@code ReportQueries}: these are aggregates, and reading the tables avoids importing the
 * product module's entities. Archived (DELETED) products are left out everywhere.
 *
 * <p>A variant is out at 0 and low at 1..threshold — the two never overlap, so the counts add up.
 */
@Component
@RequiredArgsConstructor
public class InventoryQueries {

    private final JdbcClient jdbc;

    /**
     * Every leaf category, empty ones included so a bare shelf shows up, plus any non-leaf that
     * holds products directly — the catalogue never does that, but this must not hide stock if it does.
     */
    public List<CategoryStockResponse> categoryStock(int threshold) {
        return jdbc
            .sql(
                """
                SELECT c.id, c.name, c.slug, parent.name AS parent_name,
                       COUNT(DISTINCT p.id)                                             AS products,
                       COUNT(v.id)                                                      AS variants,
                       COALESCE(SUM(v.stock), 0)                                        AS units,
                       COUNT(v.id) FILTER (WHERE v.stock > 0 AND v.stock <= :threshold) AS low,
                       COUNT(v.id) FILTER (WHERE v.stock = 0)                           AS out_of_stock,
                       COUNT(DISTINCT p.id) FILTER (WHERE v.stock <= :threshold)        AS attention
                FROM categories c
                LEFT JOIN categories parent ON parent.id = c.parent_id
                LEFT JOIN products p ON p.category_id = c.id AND p.status <> 'DELETED'
                LEFT JOIN product_variants v ON v.product_id = p.id
                GROUP BY c.id, c.name, c.slug, c.sort_order, parent.name, parent.sort_order
                HAVING NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = c.id)
                    OR COUNT(p.id) > 0
                ORDER BY parent.sort_order NULLS FIRST, parent.name NULLS FIRST, c.sort_order, c.name
                """
            )
            .param("threshold", threshold)
            .query((rs, row) ->
                new CategoryStockResponse(
                    rs.getLong("id"),
                    rs.getString("name"),
                    rs.getString("slug"),
                    rs.getString("parent_name"),
                    rs.getLong("products"),
                    rs.getLong("variants"),
                    rs.getLong("units"),
                    rs.getLong("low"),
                    rs.getLong("out_of_stock"),
                    rs.getLong("attention")
                )
            )
            .list();
    }

    public record ProductStockRow(
        Long productId,
        String name,
        RecordStatus status,
        String thumbnail,
        Long categoryId,
        String categoryName,
        String parentCategoryName,
        long totalStock
    ) {}

    /**
     * Neediest first: ordered by the product's lowest variant, so a sold-out size sorts to the top
     * even when its siblings are well stocked.
     */
    public List<ProductStockRow> productPage(InventoryQueryParams query) {
        Filter filter = filter(query);

        return jdbc
            .sql(
                """
                SELECT p.id, p.name, p.status, p.thumbnail_url, c.id AS category_id, c.name AS category_name,
                       parent.name AS parent_name, COALESCE(s.total, 0) AS total_stock
                FROM products p
                JOIN categories c ON c.id = p.category_id
                LEFT JOIN categories parent ON parent.id = c.parent_id
                LEFT JOIN (
                    SELECT product_id, SUM(stock) AS total, MIN(stock) AS lowest
                    FROM product_variants
                    GROUP BY product_id
                ) s ON s.product_id = p.id
                WHERE %s
                ORDER BY s.lowest ASC NULLS LAST, p.name, p.id
                LIMIT :limit OFFSET :skip
                """.formatted(filter.where())
            )
            .params(filter.params())
            .param("limit", query.limitOrDefault())
            .param("skip", query.skipOrDefault())
            .query((rs, row) ->
                new ProductStockRow(
                    rs.getLong("id"),
                    rs.getString("name"),
                    RecordStatus.valueOf(rs.getString("status")),
                    rs.getString("thumbnail_url"),
                    rs.getLong("category_id"),
                    rs.getString("category_name"),
                    rs.getString("parent_name"),
                    rs.getLong("total_stock")
                )
            )
            .list();
    }

    public long countProducts(InventoryQueryParams query) {
        Filter filter = filter(query);

        return jdbc
            .sql(
                "SELECT COUNT(*) FROM products p WHERE %s".formatted(filter.where())
            )
            .params(filter.params())
            .query(Long.class)
            .single();
    }

    /** All variants of the page's products in one query, in the order they were created (S, M, L…). */
    public Map<Long, List<VariantStockResponse>> variantsFor(Collection<Long> productIds) {
        Map<Long, List<VariantStockResponse>> byProduct = new LinkedHashMap<>();
        if (productIds.isEmpty()) {
            return byProduct; // `IN ()` is not valid SQL
        }

        jdbc
            .sql(
                """
                SELECT id, product_id, size, sku, stock
                FROM product_variants
                WHERE product_id IN (:ids)
                ORDER BY product_id, id
                """
            )
            .param("ids", productIds)
            .query((rs, row) -> {
                byProduct
                    .computeIfAbsent(rs.getLong("product_id"), id -> new ArrayList<>())
                    .add(
                        new VariantStockResponse(
                            rs.getLong("id"),
                            rs.getString("size"),
                            rs.getString("sku"),
                            rs.getInt("stock")
                        )
                    );
                return null;
            })
            .list();

        return byProduct;
    }

    private record Filter(String where, Map<String, Object> params) {}

    /**
     * Only constant fragments are concatenated; every value is a bound parameter. Built this way
     * rather than as `:x IS NULL OR …`, because Postgres cannot infer the type of a null parameter.
     */
    private Filter filter(InventoryQueryParams query) {
        List<String> conditions = new ArrayList<>(List.of("p.status <> 'DELETED'"));
        Map<String, Object> params = new LinkedHashMap<>();

        if (query.categoryId() != null) {
            conditions.add("p.category_id = :categoryId");
            params.put("categoryId", query.categoryId());
        }

        String search = query.searchOrNull();
        if (search != null) {
            conditions.add(
                "(p.name ILIKE :pattern OR EXISTS (SELECT 1 FROM product_variants sv " +
                    "WHERE sv.product_id = p.id AND sv.sku ILIKE :pattern))"
            );
            params.put("pattern", "%" + escapeLike(search) + "%");
        }

        switch (query.stockOrDefault()) {
            case LOW -> {
                conditions.add(
                    "EXISTS (SELECT 1 FROM product_variants fv WHERE fv.product_id = p.id AND fv.stock <= :threshold)"
                );
                params.put("threshold", query.thresholdOrDefault());
            }
            case OUT -> conditions.add(
                "EXISTS (SELECT 1 FROM product_variants fv WHERE fv.product_id = p.id AND fv.stock = 0)"
            );
            case ALL -> {}
        }

        return new Filter(String.join(" AND ", conditions), params);
    }

    /** So a search for "50%" means the characters, not "50 followed by anything". */
    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
