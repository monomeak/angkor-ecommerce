package com.angkor.commerce.report.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * One envelope for every report. Because the shape carries its own {@link ReportColumn} list,
 * adding a third report costs a SQL query and nothing else — no new DTO, no new table component,
 * no new PDF template.
 *
 * @param startDate resolved server-side; a preset like "last 3 months" is undatable once the
 *                  file is saved, so the range travels with the data.
 * @param totals    computed over the whole period by its own query. Never the sum of {@code rows},
 *                  which is only ever one page.
 */
public record ReportResponse(
    String reportType,
    String title,
    LocalDate startDate,
    LocalDate endDate,
    String basis,
    String currency,
    Instant generatedAt,
    List<ReportColumn> columns,
    List<Map<String, Object>> rows,
    Map<String, Object> totals
) {}
