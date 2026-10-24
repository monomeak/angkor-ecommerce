package com.angkor.commerce.report.dto.response;

/**
 * How one column of a report should be read. Shipping this with the data is what lets a single
 * table component, a single CSV writer and a single jsreport template serve every report: they
 * loop the columns instead of knowing any report's field names.
 *
 * <p>Align and Format stay UPPERCASE on the wire — the report template lowercases them itself
 * for its CSS class names ({@code {{lower align}}}).
 */
public record ReportColumn(String key, String label, Align align, Format format) {
    public enum Align {
        LEFT,
        RIGHT
    }

    public enum Format {
        TEXT,
        NUMBER,
        MONEY,
        PERCENT,
        DATE
    }

    public static ReportColumn text(String key, String label) {
        return new ReportColumn(key, label, Align.LEFT, Format.TEXT);
    }

    public static ReportColumn date(String key, String label) {
        return new ReportColumn(key, label, Align.LEFT, Format.DATE);
    }

    public static ReportColumn number(String key, String label) {
        return new ReportColumn(key, label, Align.RIGHT, Format.NUMBER);
    }

    public static ReportColumn money(String key, String label) {
        return new ReportColumn(key, label, Align.RIGHT, Format.MONEY);
    }

    public static ReportColumn percent(String key, String label) {
        return new ReportColumn(key, label, Align.RIGHT, Format.PERCENT);
    }
}
