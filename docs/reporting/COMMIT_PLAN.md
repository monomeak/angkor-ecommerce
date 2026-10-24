# Reporting — suggested commits

Seven commits, grouped by area and ordered so each one builds and tests green on its own.
**Order matters between C1 and C2**: the report queries read `paid_at` and `invoice_items.category`,
so the schema has to land first or a bisect lands on a broken build.

No `Co-Authored-By` trailers, per the repo rule in `README.md`.

> [!warning] Files in the tree that are **not** part of this work
> Don't let these get swept into the commits below — they were already modified when the
> reporting work started, or belong to something else you have in flight:
>
> - `docker-compose.yml` (the jsreport service + `container_name:` additions)
> - `apps/core-api/.../common/storage/minio/MinioImageStorageService.java`
> - `apps/core-api/.../dashboard/impl/DashboardServiceImpl.java`
> - `apps/back-office-portal/app/[locale]/(auth)/login/page.tsx`
> - `apps/back-office-portal/app/[locale]/(dashboard)/overview/page.tsx`
> - `apps/back-office-portal/app/globals.css`
> - `apps/back-office-portal/src/features/dashboard-overview/components/wave-icon.tsx`
> - `docs/reporting/files.zip` (deleted), `docs/reporting/files-for-js-report/`
>
> Use `git add <path>` per commit rather than `git add -A`.

---

## C1 — core-api: cash basis and the category snapshot

```
feat(core-api): record when an invoice was paid and what category each line sold

Reports answer "what money arrived this period", which issue_date cannot
answer: an invoice issued in August and paid in September belongs to
September. Adds invoices.paid_at, stamped in refreshPaymentState — the one
chokepoint all three PAID transitions go through — and cleared when an
invoice leaves PAID, so voiding a payment drops it out of the period
instead of stranding it there.

Also snapshots the root category on each invoice line, alongside the title
and price it already snapshots, so renaming a category cannot rewrite last
year's report. Backfilled from the current product -> category for existing
rows.
```

```bash
git add apps/core-api/src/main/resources/db/migration/V11__reporting_cash_basis.sql \
        apps/core-api/src/main/java/com/angkor/commerce/invoice/Invoice.java \
        apps/core-api/src/main/java/com/angkor/commerce/invoice/InvoiceItem.java \
        apps/core-api/src/main/java/com/angkor/commerce/invoice/impl/InvoiceServiceImpl.java \
        apps/core-api/src/main/java/com/angkor/commerce/product/repositories/ProductRepository.java
```

---

## C2 — core-api: the report module

```
feat(core-api): add the invoice and sales-by-category reports

Implements steps 1-5 of docs/reporting/documents-and-reporting-guide-update.md.

GET /reports/invoices and GET /reports/sales-by-category return one
ReportResponse envelope carrying its own columns[], which is what lets a
single table component, CSV writer and jsreport template serve every
report — a third report costs a SQL query and nothing else.

Native SQL through JdbcClient rather than JPA: these are aggregates across
tables owned by three modules, and JPQL would mean importing Invoice and
Customer into the report package.

The two reports divide the same money two ways, so their grand totals have
to agree. Category revenue is therefore the line's share of the invoice
total, not the raw line total — invoice-level discount and tax are applied
to the subtotal, which is by definition the sum of the lines.

The customer phone column is SUPER_ADMIN only and is absent from columns[]
entirely for a shop admin, not blanked: this report gets exported and
emailed around.
```

```bash
git add apps/core-api/src/main/java/com/angkor/commerce/report/ \
        apps/core-api/src/main/java/com/angkor/commerce/common/ApiConstants.java \
        apps/core-api/src/test/java/com/angkor/commerce/ReportPeriodTest.java \
        apps/core-api/src/test/java/com/angkor/commerce/ReportReconciliationTest.java \
        apps/core-api/src/test/java/com/angkor/commerce/SalesReportEndpointTest.java \
        apps/core-api/src/test/java/com/angkor/commerce/SalesReportQueryTest.java
```

Note `git add` on the `report/` directory also stages the deletion of the empty
`dto/response/ReportResponse.java` placeholder and the superseded
`SalesReportResponse`/`TopProductRow`/`TopCustomerRow` DTOs.

---

## C3 — core-api: bad query params are 400, not 500

Independent of reporting and worth its own commit — it changes behaviour on every
endpoint that takes an enum or validated query param.

```
fix(core-api): answer an unbindable query param with 400 instead of 500

Query and path params bind through the ConversionService, so a bad one
throws MethodArgumentTypeMismatchException rather than
MethodArgumentNotValidException. With no handler for it, it fell through to
the catch-all @ExceptionHandler(Exception.class) and ?period=banana came
back a 500. Constraints on @RequestParam arguments of an @Validated
controller (ConstraintViolationException) had the same problem.
```

```bash
git add apps/core-api/src/main/java/com/angkor/commerce/common/exception/GlobalExceptionHandler.java
```

---

## C4 — portal: the reports screen

```
feat(back-office): put the reports screen on core-api

Replaces the client-side aggregation of DummyJSON carts with the two real
report endpoints. core-api ships columns[] with the data, so ReportTable and
the CSV writer loop the columns and read each row by column.key instead of
knowing either report's fields — a third report needs no change here.

lib/report-cells.ts is the screen twin of the cell helper in the jsreport
template, so the PDF and the table cannot disagree about what a column
means.

CSV is built from the payload already on screen, so exporting costs no
second request and the file cannot disagree with the table. It carries raw
numbers, not formatted ones: a spreadsheet has to be able to sum the
column.

Deletes src/features/invoices/mock/, whose invented paid/pending/overdue/
draft statuses were never core-api's and which existed only for this
screen.
```

```bash
git add apps/back-office-portal/src/features/reports/ \
        apps/back-office-portal/src/features/invoices/mock/ \
        apps/back-office-portal/messages/en.json \
        apps/back-office-portal/messages/km.json
```

---

## C5 — portal: analytics on real numbers

Must come after C4 — it imports `features/reports/hooks/use-report`.

```
refactor(back-office): feed AI insights the real reports

The analytics page aggregated DummyJSON carts and sent the AI invented
invoice statuses. It now reads the same two reports the /reports screen
draws, so the AI cannot comment on numbers that differ from the ones the
reader can see.

Aggregates only: the invoice report is one row per invoice carrying
customer names and, for a super admin, phone numbers, so only its totals
row crosses over. The prompt drops per-month status trends, which the data
no longer contains, in favour of period totals and category concentration.
```

```bash
git add apps/back-office-portal/src/features/insights/ \
        apps/back-office-portal/app/api/insights/analyze/route.ts
```

---

## C6 — docs

```
docs: record the reporting build and refresh the portal agent guide

AGENTS.md still described reports as unported and told the next reader to
delete the invoices mock "when reports is ported" — both now stale.
```

```bash
git add apps/back-office-portal/AGENTS.md \
        docs/reporting/documents-and-reporting-guide-update.md \
        docs/reporting/COMMIT_PLAN.md \
        docs/reporting/REMAINING_TASKS.md
```

Decide separately what to do with `docs/reporting/report-module-build-guide.md` — the new
guide's frontmatter supersedes it, so it is either deleted in this commit or kept with a
pointer at the top saying so.

---

## C7 — agent instructions: one file at the root

Independent of the reporting work — commit it separately whenever suits.

```
docs: merge root AGENTS.md into CLAUDE.md

Two root files described the same project and disagreed in six places, with
the code siding against them each time. CLAUDE.md is now the only copy and
AGENTS.md is a one-line pointer to it, so anything reading either name gets
the same content. Matches the direction the two portals already use, only
inverted: there CLAUDE.md points at AGENTS.md.

Corrected while merging: Flyway owns the schema (ddl-auto: validate), not
ddl-auto=update; react-hook-form is adopted; the scripts are lint:back /
build:back; PARTIALLY_PAID is reachable via a payment void; Jackson settings
live in JacksonConfig.java; the admin portal is apps/back-office-portal.
```

```bash
git add CLAUDE.md AGENTS.md
```

---

## Verification per commit

| Commit | Command |
|---|---|
| C1, C2, C3 | `cd apps/core-api && ./mvnw test` |
| C4, C5 | `pnpm lint:back && pnpm build:back` |
| C6, C7 | none |

`ApiApplicationTests.contextLoads` fails on `main` already — it has no `@ActiveProfiles("dev")`,
so `JwtTokenProvider` throws on the missing JWT secret. It passes with
`-Dspring.profiles.active=dev`. See REMAINING_TASKS.md.
