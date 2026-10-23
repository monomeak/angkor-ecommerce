---
title: Report Module — Build Guide
project: angkor-commerce
tags:
  - angkor-commerce
  - report
  - implementation
created: 2026-08-06
updated: 2026-08-06 (paid-only basis)
depends_on: "[[Online Payment with ABA PayWay — Full Implementation Guide]]"
---

# Report Module — Build Guide

> [!abstract] What we are building
> One endpoint that answers "how did the shop do?" for a chosen period:
>
> ```
> GET /api/v1/reports/sales?period=last_3_months
> ```
>
> Returns: revenue, invoice count, new customers, active customers,
> units sold, top 5 products, top 5 customers.
>
> Periods: `this_month`, `last_2_months`, `last_3_months`,
> `last_6_months`, `last_12_months`.

> [!important] The one rule: only money that actually arrived
> This report counts **PAID invoices only**. Issued-but-unpaid,
> partially paid, overdue, draft, cancelled — all ignored.
>
> A PAID invoice has `balance = 0`, so its `total` **is** the money
> that arrived (the sum of its COMPLETED payments). That gives one
> clean revenue number with no billed-versus-collected ambiguity, and
> it means the whole report needs only three tables: `invoices`,
> `invoice_items`, `customers`. The payments table never has to be
> queried at all.
>
> ```
> revenue = SUM(invoices.total) WHERE invoice_status = 'PAID'
>         = money in the bank for those sales
> ```
>
> A nice free property: if a payment is later **voided**, the invoice
> drops from PAID back to PARTIALLY_PAID — and falls out of the report
> automatically. The numbers self-correct.

> [!note] Matches your module plan
> Your [[module-details]] already defines this module's shape: a
> controller, a service, response DTOs — **no entity, no JPA
> repository**. Reports own no data; they read what other modules
> wrote.

## Two smaller decisions

**Currencies do not add up.** `50 USD + 50,000 KHR` is not a number.
The report takes a `currency` parameter (default USD); every money
figure is scoped to it. Quantity figures are currency-free.

**Dates anchor on `issue_date`.** In your automated checkout, the
invoice is created at the moment payment confirms — so issue date *is*
payment date, and revenue lands in the right month by construction.
The one skew: a manual invoice issued in June and paid in August
reports under June. Acceptable for now; flagged in "Later" if it ever
matters.

> [!question] Why native SQL and not JPA here
> Reporting is aggregation — `SUM`, `COUNT(DISTINCT …)`, `GROUP BY`,
> `LIMIT 5` — across tables owned by three different modules. JPQL
> would mean importing `Invoice` and `Customer` entities into the
> report package, exactly the cross-module coupling your architecture
> forbids.
>
> Read-only native SQL through `JdbcClient` reads the *tables*, not
> the entities. No boundary crossed, and verifying a number by hand is
> literally running the same query. This is why your module plan gives
> report no repository.

## Build order

```
1. Period enum       → the date ranges
2. Response DTOs
3. Query class       → the SQL, via JdbcClient
4. Service
5. Controller
6. Test
```

---

# Step 1 — The period enum

File: `report/ReportPeriod.java`

```java
package com.angkor.commerce.report;

public enum ReportPeriod {

    THIS_MONTH(1),
    LAST_2_MONTHS(2),
    LAST_3_MONTHS(3),
    LAST_6_MONTHS(6),
    LAST_12_MONTHS(12);

    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    private final int months;

    ReportPeriod(int months) {
        this.months = months;
    }

    /**
     * Calendar months, not rolling days: LAST_3_MONTHS on 6 Aug means
     * 1 June → today, i.e. the current month plus the two before it.
     *
     * The end is EXCLUSIVE (first day of next month) so a sale on the
     * last day at 23:59 is never lost to a boundary bug.
     */
    public DateRange resolve() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate start = today.withDayOfMonth(1).minusMonths(months - 1L);
        LocalDate endExclusive = today.withDayOfMonth(1).plusMonths(1);
        return new DateRange(start, endExclusive);
    }

    public record DateRange(LocalDate start, LocalDate endExclusive) {}
}
```

> [!note] "Last 3 months" is a choice, not a fact
> This reads it as *calendar* months including the current one
> (June + July + August-so-far). The other reading is a rolling 90
> days. Calendar months match how shop owners think ("how was July?")
> and make month-over-month charts possible later.

> [!tip] Lowercase in the URL
> `?period=last_3_months` works because of the
> `StringToEnumConverterFactory` you registered during the Jackson
> debugging — query params go through Spring's converters, not
> Jackson. If that converter never got registered, this endpoint is
> where it becomes mandatory.

---

# Step 2 — Response DTOs

File: `report/dto/response/SalesReportResponse.java`

```java
package com.angkor.commerce.report.dto.response;

public record SalesReportResponse(
    ReportPeriod period,
    LocalDate startDate,
    LocalDate endDate,             // inclusive, for display
    String currency,

    BigDecimal totalRevenue,       // sum of PAID invoice totals = money arrived
    long paidInvoices,
    long unitsSold,                // total quantity across their items
    long newCustomers,             // registered in the period
    long activeCustomers,          // distinct customers with a PAID invoice

    List<TopProductRow> topProducts,
    List<TopCustomerRow> topCustomers
) {}
```

```java
// report/dto/response/TopProductRow.java
public record TopProductRow(
    Long productId,
    String title,
    long quantitySold,
    BigDecimal revenue           // sum of discounted line totals
) {}
```

```java
// report/dto/response/TopCustomerRow.java
public record TopCustomerRow(
    Long customerId,
    String name,
    long paidInvoices,
    BigDecimal totalSpent
) {}
```

---

# Step 3 — The queries

File: `report/ReportQueries.java`

```java
package com.angkor.commerce.report;

/**
 * Read-only aggregation over the database. Deliberately NOT a JPA
 * repository — reports read tables, not entities, so no business
 * module is imported here.
 *
 * ONE RULE everywhere: invoice_status = 'PAID'. Money that has not
 * arrived does not exist for this report.
 */
@Component
@RequiredArgsConstructor
public class ReportQueries {

    private final JdbcClient jdbc;

    // ── Revenue ────────────────────────────────────────────

    public BigDecimal totalRevenue(LocalDate start, LocalDate end, String currency) {
        return jdbc.sql("""
                SELECT COALESCE(SUM(i.total), 0)
                FROM invoices i
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.issue_date >= :start AND i.issue_date < :end
                """)
                .param("currency", currency)
                .param("start", start)
                .param("end", end)
                .query(BigDecimal.class)
                .single();
    }

    // ── Counts ─────────────────────────────────────────────

    public long paidInvoices(LocalDate start, LocalDate end, String currency) {
        return jdbc.sql("""
                SELECT COUNT(*)
                FROM invoices i
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.issue_date >= :start AND i.issue_date < :end
                """)
                .param("currency", currency)
                .param("start", start)
                .param("end", end)
                .query(Long.class)
                .single();
    }

    public long unitsSold(LocalDate start, LocalDate end, String currency) {
        return jdbc.sql("""
                SELECT COALESCE(SUM(ii.quantity), 0)
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.issue_date >= :start AND i.issue_date < :end
                """)
                .param("currency", currency)
                .param("start", start)
                .param("end", end)
                .query(Long.class)
                .single();
    }

    public long newCustomers(LocalDate start, LocalDate end) {
        ZoneId zone = ZoneId.of("Asia/Phnom_Penh");
        return jdbc.sql("""
                SELECT COUNT(*)
                FROM customers c
                WHERE c.status <> 'DELETED'
                  AND c.created_at >= :start AND c.created_at < :end
                """)
                .param("start", start.atStartOfDay(zone).toOffsetDateTime())
                .param("end", end.atStartOfDay(zone).toOffsetDateTime())
                .query(Long.class)
                .single();
    }

    public long activeCustomers(LocalDate start, LocalDate end, String currency) {
        return jdbc.sql("""
                SELECT COUNT(DISTINCT i.customer_id)
                FROM invoices i
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.issue_date >= :start AND i.issue_date < :end
                """)
                .param("currency", currency)
                .param("start", start)
                .param("end", end)
                .query(Long.class)
                .single();
    }

    // ── Top 5s ─────────────────────────────────────────────

    public List<TopProductRow> topProducts(LocalDate start, LocalDate end,
                                           String currency, int limit) {
        return jdbc.sql("""
                SELECT ii.product_id,
                       MAX(ii.title)            AS title,
                       SUM(ii.quantity)         AS quantity_sold,
                       SUM(ii.discounted_total) AS revenue
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.issue_date >= :start AND i.issue_date < :end
                  AND ii.product_id IS NOT NULL
                GROUP BY ii.product_id
                ORDER BY quantity_sold DESC, revenue DESC
                LIMIT :limit
                """)
                .param("currency", currency)
                .param("start", start)
                .param("end", end)
                .param("limit", limit)
                .query((rs, rowNum) -> new TopProductRow(
                        rs.getLong("product_id"),
                        rs.getString("title"),
                        rs.getLong("quantity_sold"),
                        rs.getBigDecimal("revenue")))
                .list();
    }

    public List<TopCustomerRow> topCustomers(LocalDate start, LocalDate end,
                                             String currency, int limit) {
        return jdbc.sql("""
                SELECT i.customer_id,
                       MAX(c.first_name || ' ' || c.last_name) AS name,
                       COUNT(*)     AS paid_invoices,
                       SUM(i.total) AS total_spent
                FROM invoices i
                JOIN customers c ON c.id = i.customer_id
                WHERE i.invoice_status = 'PAID'
                  AND i.status <> 'DELETED'
                  AND i.currency = :currency
                  AND i.issue_date >= :start AND i.issue_date < :end
                GROUP BY i.customer_id
                ORDER BY total_spent DESC
                LIMIT :limit
                """)
                .param("currency", currency)
                .param("start", start)
                .param("end", end)
                .param("limit", limit)
                .query((rs, rowNum) -> new TopCustomerRow(
                        rs.getLong("customer_id"),
                        rs.getString("name"),
                        rs.getLong("paid_invoices"),
                        rs.getBigDecimal("total_spent")))
                .list();
    }
}
```

> [!warning] Request values go through `:named` parameters, always
> `currency`, the dates, and `limit` come from outside — they are bound
> as parameters, never concatenated into the SQL string. That is the
> difference between a report and a SQL injection.

> [!note] Small details worth seeing
> - `product_id IS NOT NULL` — manual invoice lines ("Website
>   Development") have no product, so they can't rank in top products.
>   They still count in `unitsSold` and revenue.
> - `MAX(ii.title)` — one product appears under different snapshot
>   titles over time ("Polo — M", "Polo — L"); `GROUP BY` needs one
>   value and `MAX` picks it deterministically.
> - `discounted_total` for product revenue — what the line actually
>   earned after its discount, not the sticker figure.

---

# Step 4 — Service

File: `report/ReportService.java`

```java
package com.angkor.commerce.report;

public interface ReportService {
    SalesReportResponse salesReport(ReportPeriod period, String currency);
}
```

File: `report/impl/ReportServiceImpl.java`

```java
package com.angkor.commerce.report.impl;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private static final int TOP_LIMIT = 5;

    private final ReportQueries queries;

    @Override
    public SalesReportResponse salesReport(ReportPeriod period, String currency) {

        ReportPeriod.DateRange range = period.resolve();
        LocalDate start = range.start();
        LocalDate end = range.endExclusive();

        return new SalesReportResponse(
                period,
                start,
                end.minusDays(1),                    // inclusive, for display
                currency,
                queries.totalRevenue(start, end, currency),
                queries.paidInvoices(start, end, currency),
                queries.unitsSold(start, end, currency),
                queries.newCustomers(start, end),
                queries.activeCustomers(start, end, currency),
                queries.topProducts(start, end, currency, TOP_LIMIT),
                queries.topCustomers(start, end, currency, TOP_LIMIT)
        );
    }
}
```

---

# Step 5 — Controller

File: `report/ReportController.java`

```java
package com.angkor.commerce.report;

@RestController
@RequestMapping(ApiConstants.REPORTS_BASE)
@RequiredArgsConstructor
@Validated
@Tag(name = "Reports")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales")
    @IsAdmin
    @Operation(summary = "Sales report (paid invoices only) for a period")
    public SalesReportResponse salesReport(
            @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
            @RequestParam(defaultValue = "USD")
            @Pattern(regexp = "^[A-Z]{3}$") String currency) {
        return reportService.salesReport(period, currency);
    }
}
```

```java
// ApiConstants — add:
public static final String REPORTS_BASE = API_V1 + "/reports";
```

```java
// SecurityConfig — above anyRequest():
.requestMatchers("/api/v1/reports/**").hasAnyRole("SHOP_ADMIN", "SUPER_ADMIN")
```

Reports expose the whole shop's numbers — staff only.

---

# Step 6 — Test

```bash
curl -b staff.txt 'localhost:8080/api/v1/reports/sales?period=last_3_months'
```

Expected shape:

```json
{
  "period": "last_3_months",
  "startDate": "2026-06-01",
  "endDate": "2026-08-06",
  "currency": "USD",
  "totalRevenue": 1150.0000,
  "paidInvoices": 38,
  "unitsSold": 124,
  "newCustomers": 12,
  "activeCustomers": 17,
  "topProducts": [
    { "productId": 1, "title": "Men's Classic Polo Shirt — M",
      "quantitySold": 34, "revenue": 391.0000 }
  ],
  "topCustomers": [
    { "customerId": 5, "name": "Dara Sok",
      "paidInvoices": 7, "totalSpent": 402.5000 }
  ]
}
```

## Verify by hand

The whole point of native SQL — the check is the same query:

```sql
SELECT COALESCE(SUM(total), 0) FROM invoices
WHERE invoice_status = 'PAID' AND status <> 'DELETED'
  AND currency = 'USD'
  AND issue_date >= '2026-06-01' AND issue_date < '2026-09-01';
```

And the paid-only rule has a built-in cross-check: for the same set of
invoices, `SUM(total)` must equal `SUM(paid_amount)` — PAID means
`balance = 0`. If they ever differ, an invoice is marked PAID that
should not be:

```sql
SELECT id, invoice_number FROM invoices
WHERE invoice_status = 'PAID' AND total <> paid_amount;
-- must always return zero rows
```

## Checks worth running

| Test | Expect |
|---|---|
| ISSUED (unpaid) invoice in the period | not counted anywhere |
| PARTIALLY_PAID invoice | not counted — money not fully arrived |
| **Void a payment on a PAID invoice, rerun** | invoice drops to PARTIALLY_PAID and falls out; revenue shrinks by its total |
| Cancel an invoice | already excluded (CANCELLED ≠ PAID) |
| Invoice dated the 1st of the start month | included |
| Invoice dated today | included (exclusive end is next month's 1st) |
| `?period=this_month` lowercase | works via the enum converter |
| `?period=banana` | 400, not 500 |
| `?currency=KHR` with no KHR sales | zeros and empty lists, not an error |
| Manual invoice line (no product) on a PAID invoice | in `unitsSold`, absent from `topProducts` |
| Customer token on `/reports/sales` | 403 |

> [!important] The void test is the one to actually run
> It proves the report's best property: numbers that self-correct.
> Record a payment, watch revenue rise; void it, watch the same
> invoice's whole total leave the report. No special handling in the
> report code — the invoice status machine does the work.

---

# Later, when someone asks

> [!question] Month-by-month breakdown for charts
> One more query grouping by `date_trunc('month', issue_date)` with the
> same `PAID` filter, returning `List<MonthRow(month, revenue,
> invoices)>`. The period enum already gives the range.

> [!question] Partially-paid money
> Today a 100-dollar invoice with 60 paid contributes nothing. If the
> shop ever wants to see that 60, add a separate `partialCollected`
> figure from `SUM(paid_amount) WHERE invoice_status =
> 'PARTIALLY_PAID'` — as its own number, never mixed into
> `totalRevenue`.

> [!question] Attributing manual invoices to their payment month
> A manual invoice issued in June and paid in August currently reports
> under June. If that ever matters, the fix is joining through
> `payments.payment_date` instead of `issue_date` — a bigger query, so
> only when someone actually asks.

> [!question] Custom date ranges
> `?startDate=&endDate=` alongside `period`. The service already works
> off a `DateRange` — only the controller grows.

> [!question] Export
> `SalesReportResponse` → xlsx or PDF is a rendering job, not a domain
> one — nothing here changes.

> [!question] Speed at scale
> Every query filters on `issue_date`. If reports get slow:
>
> ```sql
> CREATE INDEX idx_invoices_paid_issue_date
>     ON invoices (issue_date) WHERE invoice_status = 'PAID';
> ```
>
> Not needed at hundreds of invoices; measure before adding.

---

# Related

- [[module-details]] — the module plan this implements
- [[Invoice & Payment Modules — Build Guide]]
- [[Online Payment with ABA PayWay — Full Implementation Guide]]
- [[api-response-design]]
