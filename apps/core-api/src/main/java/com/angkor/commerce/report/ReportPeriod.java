package com.angkor.commerce.report;

import com.fasterxml.jackson.annotation.JsonValue;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public enum ReportPeriod {
    THIS_MONTH(1, "This month (to date)"),
    LAST_3_MONTHS(3, "Last 3 months"),
    LAST_6_MONTHS(6, "Last 6 months"),
    LAST_12_MONTHS(12, "Last 12 months");

    /** Same zone the invoice dates are written in. */
    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    private final int months;
    private final String label;

    ReportPeriod(int months, String label) {
        this.months = months;
        this.label = label;
    }

    /** "to date" is spelled out so nobody compares half a month against a full one. */
    public String label() {
        return label;
    }

    /** Lowercase on the wire. Reads are case-insensitive via JacksonConfig. */
    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    /**
     * Calendar months including the current one, not a rolling window of days: LAST_3_MONTHS on
     * 6 August runs from 1 June, because "how was July?" is the question shop owners actually
     * ask. The end is exclusive so a sale at 23:59 on the last day cannot fall through it.
     */
    public DateRange resolve() {
        LocalDate firstOfThisMonth = LocalDate.now(ZONE).withDayOfMonth(1);
        return new DateRange(firstOfThisMonth.minusMonths(months - 1L), firstOfThisMonth.plusMonths(1));
    }

    public record DateRange(LocalDate start, LocalDate endExclusive) {
        /** paid_at is a timestamptz, so a day boundary only means something in a named zone. */
        public OffsetDateTime startAt() {
            return start.atStartOfDay(ZONE).toOffsetDateTime();
        }

        public OffsetDateTime endAt() {
            return endExclusive.atStartOfDay(ZONE).toOffsetDateTime();
        }

        /** Inclusive, for display and filenames. */
        public LocalDate endInclusive() {
            return endExclusive.minusDays(1);
        }
    }
}
