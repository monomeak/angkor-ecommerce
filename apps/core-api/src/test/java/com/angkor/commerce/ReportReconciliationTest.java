package com.angkor.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import com.angkor.commerce.report.ReportPeriod;
import com.angkor.commerce.report.ReportService;
import com.angkor.commerce.report.dto.response.ReportResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * The two reports divide the same money two ways, so their grand totals have to agree. They are
 * computed by entirely separate SQL — one summing invoices, one summing lines — and a change to
 * either query can quietly break the tie.
 *
 * <p>Rows are inserted directly rather than through the invoice service: the point is to pin the
 * SQL against known numbers, and going through checkout would make the expected values depend on
 * pricing rules that have nothing to do with reporting.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
@Transactional // rolls back, so the empty-database expectations of the other report tests survive
class ReportReconciliationTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    @Autowired
    ReportService reportService;

    @Autowired
    JdbcClient jdbc;

    private LocalDate paidOn;

    @BeforeEach
    void seedTwoPaidInvoices() {
        paidOn = LocalDate.now(ZONE);

        Long dara = insertCustomer("Dara", "Sok", "dara.report@example.com");
        Long mealea = insertCustomer("Mealea", "Chan", "mealea.report@example.com");

        // 40.00 across two categories, then 25.00 in one of them again.
        Long first = insertPaidInvoice("INV-RPT-0001", dara, new BigDecimal("40.0000"));
        insertLine(first, 1, "Men", new BigDecimal("10.0000"), 2);
        insertLine(first, 2, "Women", new BigDecimal("20.0000"), 1);

        Long second = insertPaidInvoice("INV-RPT-0002", mealea, new BigDecimal("25.0000"));
        insertLine(second, 1, "Men", new BigDecimal("25.0000"), 1);
    }

    @Test
    void theTwoReportsAgreeOnTheGrandTotal() {
        ReportResponse invoices = reportService.invoiceReport(ReportPeriod.THIS_MONTH, "USD", false);
        ReportResponse categories = reportService.salesByCategory(ReportPeriod.THIS_MONTH, "USD");

        assertThat((BigDecimal) invoices.totals().get("total")).isEqualByComparingTo("65.0000");
        assertThat((BigDecimal) categories.totals().get("revenue")).isEqualByComparingTo(
            (BigDecimal) invoices.totals().get("total")
        );
    }

    @Test
    void theInvoiceReportCountsCustomersNotRows() {
        ReportResponse invoices = reportService.invoiceReport(ReportPeriod.THIS_MONTH, "USD", false);

        assertThat(invoices.rows()).hasSize(2);
        assertThat(invoices.totals()).containsEntry("label", "2 customers").containsEntry("totalItems", 4L);
        assertThat(invoices.rows().getFirst()).containsEntry("paidAt", paidOn);
    }

    @Test
    void categoriesRankByRevenueAndTheirSharesAddUp() {
        List<Map<String, Object>> rows = reportService.salesByCategory(ReportPeriod.THIS_MONTH, "USD").rows();

        assertThat(rows)
            .extracting(row -> row.get("category"))
            .containsExactly("Men", "Women");
        assertThat((BigDecimal) rows.getFirst().get("revenue")).isEqualByComparingTo("45.0000");
        assertThat((BigDecimal) rows.getFirst().get("share")).isEqualByComparingTo("69.2");

        BigDecimal shares = rows
            .stream()
            .map(row -> (BigDecimal) row.get("share"))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(shares).isEqualByComparingTo("100.0");
    }

    /** The cash basis in one assertion: an invoice paid outside the window is not this month's money. */
    @Test
    void anInvoicePaidBeforeTheWindowIsNotCountedInIt() {
        jdbc.sql(
            "UPDATE invoices SET paid_at = paid_at - INTERVAL '2 months' WHERE invoice_number = 'INV-RPT-0002'"
        ).update();

        ReportResponse invoices = reportService.invoiceReport(ReportPeriod.THIS_MONTH, "USD", false);

        assertThat(invoices.rows()).hasSize(1);
        assertThat((BigDecimal) invoices.totals().get("total")).isEqualByComparingTo("40.0000");
    }

    /** A line with no product, and so no category, must still be counted rather than disappear. */
    @Test
    void manualLinesAreGroupedRatherThanDropped() {
        Long manual = insertPaidInvoice(
            "INV-RPT-0003",
            insertCustomer("Sok", "Pisey", "pisey.report@example.com"),
            new BigDecimal("15.0000")
        );
        insertLine(manual, 1, null, new BigDecimal("15.0000"), 1);

        ReportResponse categories = reportService.salesByCategory(ReportPeriod.THIS_MONTH, "USD");

        assertThat(categories.rows())
            .extracting(row -> row.get("category"))
            .contains("Uncategorised");
        assertThat((BigDecimal) categories.totals().get("revenue")).isEqualByComparingTo("80.0000");
    }

    // ── Fixtures ──────────────────────────────────────────────────────────

    private Long insertCustomer(String firstName, String lastName, String email) {
        return jdbc
            .sql(
                """
                INSERT INTO customers (first_name, last_name, email, password_hash)
                VALUES (:firstName, :lastName, :email, 'x')
                RETURNING id
                """
            )
            .param("firstName", firstName)
            .param("lastName", lastName)
            .param("email", email)
            .query(Long.class)
            .single();
    }

    private Long insertPaidInvoice(String number, Long customerId, BigDecimal total) {
        return jdbc
            .sql(
                """
                INSERT INTO invoices (invoice_number, customer_id, invoice_status, issue_date, due_date, paid_at,
                                      subtotal, total, paid_amount, balance, currency, total_items, total_quantity)
                VALUES (:number, :customerId, 'PAID', :issueDate, :issueDate, :paidAt,
                        :total, :total, :total, 0, 'USD', 0, 0)
                RETURNING id
                """
            )
            .param("number", number)
            .param("customerId", customerId)
            .param("issueDate", paidOn)
            .param("paidAt", paidOn.atStartOfDay(ZONE).toOffsetDateTime())
            .param("total", total)
            .query(Long.class)
            .single();
    }

    /** Keeps total_quantity in step with the lines, since the report reads it for the Items column. */
    private void insertLine(Long invoiceId, int lineNumber, String category, BigDecimal price, int quantity) {
        BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(quantity));

        jdbc.sql(
            """
            INSERT INTO invoice_items (invoice_id, line_number, title, category, price, quantity, total,
                                       discounted_total)
            VALUES (:invoiceId, :lineNumber, :title, :category, :price, :quantity, :total, :total)
            """
        )
            .param("invoiceId", invoiceId)
            .param("lineNumber", lineNumber)
            .param("title", category == null ? "Website development" : category + " item")
            .param("category", category)
            .param("price", price)
            .param("quantity", quantity)
            .param("total", lineTotal)
            .update();

        jdbc.sql(
            """
            UPDATE invoices SET total_items = total_items + 1, total_quantity = total_quantity + :quantity
            WHERE id = :invoiceId
            """
        )
            .param("quantity", quantity)
            .param("invoiceId", invoiceId)
            .update();
    }
}
