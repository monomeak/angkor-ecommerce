package com.angkor.commerce.report.impl;

import com.angkor.commerce.report.ReportPeriod;
import com.angkor.commerce.report.ReportQueries;
import com.angkor.commerce.report.ReportService;
import com.angkor.commerce.report.dto.response.ReportColumn;
import com.angkor.commerce.report.dto.response.ReportResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    /** Every report here counts money that arrived, never money that was merely billed. */
    private static final String CASH_BASIS = "cash";

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final ReportQueries queries;

    @Override
    public ReportResponse invoiceReport(ReportPeriod period, String currency, boolean withPhone) {
        ReportPeriod.DateRange range = period.resolve();

        List<ReportColumn> columns = new ArrayList<>(
            List.of(
                ReportColumn.text("invoiceNumber", "Invoice"),
                ReportColumn.date("paidAt", "Paid"),
                ReportColumn.number("customerId", "Customer ID"),
                ReportColumn.text("customerName", "Customer")
            )
        );
        if (withPhone) {
            columns.add(ReportColumn.text("customerPhone", "Phone"));
        }
        columns.add(ReportColumn.number("totalItems", "Items"));
        columns.add(ReportColumn.money("totalDiscount", "Discount"));
        columns.add(ReportColumn.money("total", "Total"));

        return new ReportResponse(
            "invoices",
            "Invoice report",
            range.start(),
            range.endInclusive(),
            CASH_BASIS,
            currency,
            Instant.now(),
            columns,
            queries.invoiceRows(range, currency, withPhone),
            queries.invoiceTotals(range, currency)
        );
    }

    @Override
    public ReportResponse salesByCategory(ReportPeriod period, String currency) {
        ReportPeriod.DateRange range = period.resolve();

        Map<String, Object> totals = queries.categoryTotals(range, currency);
        List<Map<String, Object>> rows = queries.categoryRows(range, currency);
        addShares(rows, (BigDecimal) totals.get("revenue"));
        totals.put("share", rows.isEmpty() ? BigDecimal.ZERO : HUNDRED);

        return new ReportResponse(
            "sales-by-category",
            "Sales by category",
            range.start(),
            range.endInclusive(),
            CASH_BASIS,
            currency,
            Instant.now(),
            List.of(
                ReportColumn.text("category", "Category"),
                ReportColumn.number("unitsSold", "Units"),
                ReportColumn.money("discount", "Discount"),
                ReportColumn.money("revenue", "Revenue"),
                ReportColumn.percent("share", "Share")
            ),
            rows,
            totals
        );
    }

    /**
     * Share is divided in Java rather than in SQL, where it would mean either a window function
     * or running the totals query a second time as a subselect on every row.
     */
    private static void addShares(List<Map<String, Object>> rows, BigDecimal grandTotal) {
        boolean divisible = grandTotal != null && grandTotal.signum() != 0;

        for (Map<String, Object> row : rows) {
            BigDecimal revenue = (BigDecimal) row.get("revenue");
            row.put(
                "share",
                divisible ? revenue.multiply(HUNDRED).divide(grandTotal, 1, RoundingMode.HALF_UP) : BigDecimal.ZERO
            );
        }
    }
}
