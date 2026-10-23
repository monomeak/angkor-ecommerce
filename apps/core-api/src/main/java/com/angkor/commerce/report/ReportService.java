package com.angkor.commerce.report;

import com.angkor.commerce.report.dto.response.ReportResponse;

public interface ReportService {
    /**
     * One row per paid invoice.
     *
     * @param currency ISO 4217; every money figure in the response is scoped to it.
     * @param withPhone whether the customer phone column is included — see ReportController.
     */
    ReportResponse invoiceReport(ReportPeriod period, String currency, boolean withPhone);

    /** The same money as {@link #invoiceReport}, grouped by the category snapshotted on each line. */
    ReportResponse salesByCategory(ReportPeriod period, String currency);
}
