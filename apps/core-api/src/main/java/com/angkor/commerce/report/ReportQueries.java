package com.angkor.commerce.report;

import com.angkor.commerce.report.ReportPeriod.DateRange;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Deliberately not a JPA repository. Reporting aggregates across tables owned by three modules,
 * so JPQL would mean importing Invoice and Customer into this package; native SQL reads the
 * tables instead and crosses no module boundary. Verifying a figure by hand is then literally
 * running the query below.
 *
 * <p>Two rules hold throughout. Only {@code invoice_status = 'PAID'} counts — money that has not
 * arrived does not exist here. And the period is measured on {@code paid_at}, not
 * {@code issue_date}: an invoice issued in August and paid in September belongs to September,
 * which is the only way the totals reconcile against the bank.
 *
 * <p>Request values are always bound as named parameters, never concatenated in.
 */
@Component
@RequiredArgsConstructor
public class ReportQueries {

    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    /** Company first, then the given names — the SQL twin of Customer#getDisplayName. */
    private static final String DISPLAY_NAME = """
    COALESCE(
        NULLIF(BTRIM(c.company_name), ''),
        NULLIF(BTRIM(CONCAT_WS(' ', c.first_name, c.last_name)), '')
    )\
    """;

    /**
     * A line's own discount, plus its share of the discount taken off the whole invoice. The
     * share is what makes the two reports reconcile: invoice-level discount and tax are applied
     * to the subtotal, which is by definition the sum of the lines.
     */
    private static final String LINE_DISCOUNT = """
    (ii.total - ii.discounted_total)
        + ii.discounted_total * CASE WHEN i.subtotal = 0 THEN 0 ELSE i.discount_amount / i.subtotal END\
    """;

    /** The line's share of what the invoice actually collected, tax and invoice discount included. */
    private static final String LINE_REVENUE = """
    ii.discounted_total * CASE WHEN i.subtotal = 0 THEN 0 ELSE i.total / i.subtotal END\
    """;

    private final JdbcClient jdbc;

    // ── Invoice report — one row per paid invoice ──────────────────────────

    public List<Map<String, Object>> invoiceRows(DateRange range, String currency, boolean withPhone) {
        return jdbc
            .sql(
                """
                SELECT i.invoice_number,
                       i.paid_at,
                       i.customer_id,
                       %s AS customer_name,
                       c.phone,
                       i.total_quantity,
                       i.discount_amount + COALESCE(d.line_discount, 0) AS total_discount,
                       i.total
                FROM invoices i
                    JOIN customers c ON c.id = i.customer_id
                    LEFT JOIN (
                        SELECT invoice_id, SUM(total - discounted_total) AS line_discount
                        FROM invoice_items
                        GROUP BY invoice_id
                    ) d ON d.invoice_id = i.id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.paid_at >= :start AND i.paid_at < :end
                ORDER BY i.paid_at DESC, i.id DESC
                """.formatted(DISPLAY_NAME)
            )
            .param("currency", currency)
            .param("start", range.startAt())
            .param("end", range.endAt())
            .query((rs, rowNum) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("invoiceNumber", rs.getString("invoice_number"));
                row.put("paidAt", paidOn(rs.getObject("paid_at", OffsetDateTime.class)));
                row.put("customerId", rs.getLong("customer_id"));
                row.put("customerName", rs.getString("customer_name"));
                if (withPhone) {
                    row.put("customerPhone", rs.getString("phone"));
                }
                row.put("totalItems", rs.getInt("total_quantity"));
                row.put("totalDiscount", rs.getBigDecimal("total_discount"));
                row.put("total", rs.getBigDecimal("total"));
                return row;
            })
            .list();
    }

    /** Its own query over the whole period — page totals are not period totals. */
    public Map<String, Object> invoiceTotals(DateRange range, String currency) {
        return jdbc
            .sql(
                """
                SELECT COUNT(DISTINCT i.customer_id)                            AS customers,
                       COALESCE(SUM(i.total_quantity), 0)                       AS total_items,
                       COALESCE(SUM(i.discount_amount + COALESCE(d.line_discount, 0)), 0) AS total_discount,
                       COALESCE(SUM(i.total), 0)                                AS total
                FROM invoices i
                    LEFT JOIN (
                        SELECT invoice_id, SUM(total - discounted_total) AS line_discount
                        FROM invoice_items
                        GROUP BY invoice_id
                    ) d ON d.invoice_id = i.id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.paid_at >= :start AND i.paid_at < :end
                """
            )
            .param("currency", currency)
            .param("start", range.startAt())
            .param("end", range.endAt())
            .query((rs, rowNum) -> {
                long customers = rs.getLong("customers");
                Map<String, Object> totals = new LinkedHashMap<>();
                totals.put("label", customers + (customers == 1 ? " customer" : " customers"));
                // The count on its own as well as in the label: the table renders the label, but
                // anything computing with the figure should not have to parse English back out.
                totals.put("customers", customers);
                totals.put("totalItems", rs.getLong("total_items"));
                totals.put("totalDiscount", rs.getBigDecimal("total_discount"));
                totals.put("total", rs.getBigDecimal("total"));
                return totals;
            })
            .single();
    }

    // ── Sales by category ─────────────────────────────────────────────────

    /**
     * Reads the category snapshotted on the line, so no join to products — which is also why a
     * product deleted since the sale cannot silently drop its lines and shrink revenue. Manual
     * lines carry no category and are grouped under their own heading rather than vanishing.
     */
    public List<Map<String, Object>> categoryRows(DateRange range, String currency) {
        return jdbc
            .sql(
                """
                SELECT COALESCE(ii.category, 'Uncategorised') AS category,
                       SUM(ii.quantity)                       AS units_sold,
                       SUM(%s)                                AS discount,
                       SUM(%s)                                AS revenue
                FROM invoice_items ii
                    JOIN invoices i ON i.id = ii.invoice_id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.paid_at >= :start AND i.paid_at < :end
                GROUP BY COALESCE(ii.category, 'Uncategorised')
                ORDER BY revenue DESC
                """.formatted(LINE_DISCOUNT, LINE_REVENUE)
            )
            .param("currency", currency)
            .param("start", range.startAt())
            .param("end", range.endAt())
            .query((rs, rowNum) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("category", rs.getString("category"));
                row.put("unitsSold", rs.getLong("units_sold"));
                row.put("discount", rs.getBigDecimal("discount"));
                row.put("revenue", rs.getBigDecimal("revenue"));
                return row;
            })
            .list();
    }

    /** @return the same four figures as the invoice report's totals, for the reconciliation check. */
    public Map<String, Object> categoryTotals(DateRange range, String currency) {
        return jdbc
            .sql(
                """
                SELECT COUNT(DISTINCT COALESCE(ii.category, 'Uncategorised')) AS categories,
                       COALESCE(SUM(ii.quantity), 0)                          AS units_sold,
                       COALESCE(SUM(%s), 0)                                   AS discount,
                       COALESCE(SUM(%s), 0)                                   AS revenue
                FROM invoice_items ii
                    JOIN invoices i ON i.id = ii.invoice_id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.paid_at >= :start AND i.paid_at < :end
                """.formatted(LINE_DISCOUNT, LINE_REVENUE)
            )
            .param("currency", currency)
            .param("start", range.startAt())
            .param("end", range.endAt())
            .query((rs, rowNum) -> {
                long categories = rs.getLong("categories");
                Map<String, Object> totals = new LinkedHashMap<>();
                totals.put("label", categories + (categories == 1 ? " category" : " categories"));
                totals.put("unitsSold", rs.getLong("units_sold"));
                totals.put("discount", rs.getBigDecimal("discount"));
                totals.put("revenue", rs.getBigDecimal("revenue"));
                return totals;
            })
            .single();
    }

    /**
     * The report's own zone, applied once here. Everything downstream — the table, the CSV, the
     * PDF — then reads a plain date and cannot print an invoice paid at 03:36 as the day before.
     */
    private static LocalDate paidOn(OffsetDateTime paidAt) {
        return paidAt == null ? null : paidAt.atZoneSameInstant(ZONE).toLocalDate();
    }
}
