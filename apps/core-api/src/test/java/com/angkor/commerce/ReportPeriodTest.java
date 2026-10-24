package com.angkor.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import com.angkor.commerce.report.ReportPeriod;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

/** Off-by-one month here silently moves money between periods, which no failing test would show. */
class ReportPeriodTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    private static final LocalDate FIRST_OF_THIS_MONTH = LocalDate.now(ZONE).withDayOfMonth(1);

    @Test
    void thisMonthSpansOnlyTheCurrentMonth() {
        ReportPeriod.DateRange range = ReportPeriod.THIS_MONTH.resolve();

        assertThat(range.start()).isEqualTo(FIRST_OF_THIS_MONTH);
        assertThat(range.endExclusive()).isEqualTo(FIRST_OF_THIS_MONTH.plusMonths(1));
    }

    @Test
    void longerPeriodsCountTheCurrentMonthAsOneOfThem() {
        assertThat(ReportPeriod.LAST_3_MONTHS.resolve().start()).isEqualTo(FIRST_OF_THIS_MONTH.minusMonths(2));
        assertThat(ReportPeriod.LAST_12_MONTHS.resolve().start()).isEqualTo(FIRST_OF_THIS_MONTH.minusMonths(11));
    }

    @Test
    void everyPeriodEndsOnTheFirstOfNextMonth() {
        for (ReportPeriod period : ReportPeriod.values()) {
            assertThat(period.resolve().endExclusive()).isEqualTo(FIRST_OF_THIS_MONTH.plusMonths(1));
            assertThat(period.resolve().endInclusive()).isEqualTo(FIRST_OF_THIS_MONTH.plusMonths(1).minusDays(1));
        }
    }

    /** paid_at is a timestamptz, so the boundaries have to land on Phnom Penh midnight, not UTC. */
    @Test
    void theTimestampBoundsAreTheLocalMidnightsOfThoseDays() {
        ReportPeriod.DateRange range = ReportPeriod.THIS_MONTH.resolve();

        assertThat(range.startAt()).isEqualTo(range.start().atStartOfDay(ZONE).toOffsetDateTime());
        assertThat(range.endAt()).isEqualTo(range.endExclusive().atStartOfDay(ZONE).toOffsetDateTime());
    }

    @Test
    void periodsGoOutLowercase() {
        assertThat(ReportPeriod.LAST_3_MONTHS.toJson()).isEqualTo("last_3_months");
    }
}
