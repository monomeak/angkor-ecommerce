package com.angkor.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import com.angkor.commerce.report.ReportPeriod;
import com.angkor.commerce.report.ReportService;
import com.angkor.commerce.report.dto.response.ReportColumn;
import com.angkor.commerce.report.dto.response.ReportResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Every figure comes from hand-written native SQL, which the compiler never sees — a typo or a
 * column that moved only surfaces when Postgres parses it. Running both reports against an empty
 * database exercises all four statements at once.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("dev") // the default profile has no JWT secret, so the context cannot start on it
class SalesReportQueryTest {

    @Autowired
    ReportService reportService;

    @Test
    void aShopWithNoSalesReportsZerosRatherThanFailing() {
        ReportResponse report = reportService.invoiceReport(ReportPeriod.LAST_3_MONTHS, "USD", true);

        assertThat(report.rows()).isEmpty();
        assertThat(report.totals()).containsEntry("label", "0 customers").containsEntry("totalItems", 0L);
        assertThat((BigDecimal) report.totals().get("total")).isEqualByComparingTo(BigDecimal.ZERO);
    }

    /** The totals row has to render on an empty report — a table with no last row looks broken. */
    @Test
    void anEmptyCategoryReportStillCarriesItsTotals() {
        ReportResponse report = reportService.salesByCategory(ReportPeriod.LAST_3_MONTHS, "USD");

        assertThat(report.rows()).isEmpty();
        assertThat(report.totals()).containsEntry("label", "0 categories").containsEntry("unitsSold", 0L);
        assertThat((BigDecimal) report.totals().get("share")).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void bothReportsResolveThePresetAndNameTheirBasis() {
        ReportResponse report = reportService.salesByCategory(ReportPeriod.THIS_MONTH, "KHR");

        assertThat(report.reportType()).isEqualTo("sales-by-category");
        assertThat(report.basis()).isEqualTo("cash");
        assertThat(report.currency()).isEqualTo("KHR");
        assertThat(report.startDate()).isEqualTo(ReportPeriod.THIS_MONTH.resolve().start());
        assertThat(report.endDate()).isEqualTo(ReportPeriod.THIS_MONTH.resolve().endInclusive());
    }

    /** The phone column is SUPER_ADMIN only, so it must be absent from the columns, not just blank. */
    @Test
    void theInvoiceReportDropsThePhoneColumnEntirelyWhenNotPermitted() {
        ReportResponse withPhone = reportService.invoiceReport(ReportPeriod.THIS_MONTH, "USD", true);
        ReportResponse without = reportService.invoiceReport(ReportPeriod.THIS_MONTH, "USD", false);

        assertThat(withPhone.columns()).extracting(ReportColumn::key).contains("customerPhone");
        assertThat(without.columns()).extracting(ReportColumn::key).doesNotContain("customerPhone");
    }
}
