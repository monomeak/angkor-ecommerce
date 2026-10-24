# Reporting — what's left

Tracks `documents-and-reporting-guide-update.md`. Steps 1–6 of its build order are done;
7–13 are not. Ordered so each section can be picked up on its own.

## Done

- [x] 1 — `invoices.paid_at` + `invoice_items.category` (`V11__reporting_cash_basis.sql`)
- [x] 2 — `ReportPeriod` + resolver
- [x] 3 — `ReportResponse`, `ReportColumn`
- [x] 4 — `ReportQueries`, the two admin queries via `JdbcClient`
- [x] 5 — `ReportService` + `GET /reports/invoices`, `GET /reports/sales-by-category`
- [x] 6 — back-office `/reports` page, generic table, CSV export

---

## Decisions already made — don't re-litigate

| Decision | Value | Where it lives |
|---|---|---|
| Basis | Cash — `paid_at`, paid invoices only | `ReportQueries` javadoc |
| Currency | One per request, `?currency=`, defaults to `angkor.default-currency` | `ReportController` |
| Phone column | `SUPER_ADMIN` only, absent from `columns[]` for others | `ReportController.PHONE_ROLE` |
| Category grain | Root category (Men/Women/Children), snapshotted per line | `V11`, `ProductRepository.findRootCategoryNames` |
| Migrations | v0 squash is done; new change = new file, never edit `V1`–`V11` | — |

---

## Blockers to clear before the PDF work

These are small, but each one is visible in a rendered document, so they're cheaper now than
after the templates exist.

- [x] **`WALLET` is not a payment method.** *Done in `V12`; the wallet adapter now writes it.* `PaymentMethod` is `CASH, BANK_TRANSFER, QR_CODE,
      CARD, OTHER`, but `invoice-sample-payload.json` shows `"paymentMethod": "WALLET"` with
      `"paymentMethodLabel": "Wallet balance"`. Guide §11 flags that the frontend currently
      infers the label from a `WALLET-` reference-number prefix, so the logic lives in two
      places and the template would make it three. Needs a `V12` too — `chk_payments_method`
      is a DB CHECK constraint listing the five values.
- [x] **`InvoiceItemResponse` has no `category`.** The column exists as of `V11` and the sample
      payload shows it on each line; this is now a one-line addition to the record and its
      mapper.
- [x] **Confirm `sku` on the invoice payload.** Guide §14 lists this as an open question,
      inferred from a printed PDF. `InvoiceItemResponse` does carry `sku` — so this one is
      answered, and the template can render it.

---

## 7–11 — jsreport and PDFs

- [x] **Harden the compose service.** *Auth on, no CORS, no base port; dev publishes `127.0.0.1:5480` from the override, prod requires the credentials.* The current `jsreport` service publishes `5480:5488`,
      sets `JSREPORT_ENABLE_XSRF_PROTECTION=false` and `CORS_ORIGIN=*`, and has no
      authentication. Guide §2 is explicit that the browser must never talk to jsreport
      directly and §7 that it should be internal-only in production, with the published port
      moved to a `docker-compose.override.yml` for Studio access in dev.
- [x] **Custom image for Khmer fonts** (§11). *`jsreport/Dockerfile`: the base is Alpine and runs as root, so it's `apk add font-noto font-noto-khmer`, not the guide's `apt-get`.* The base image renders Khmer product titles as
      empty boxes, which reads as a template bug rather than a missing font.
      `fonts-noto-khmer` + `fonts-noto-core`.
- [x] **`jsreport/data/` committed as source**: `shared/helpers.js`, `shared/styles.css`,
      `document/`, `report/`. *Bind-mounted in compose. Every `config.json` needs an `_id` —
      without one the fs store loads the entity but renders fail with "User does not have
      permissions to read template". Shared CSS replaced the guide's `layout.html`.*
- [x] **Render both sample payloads in Studio before writing any Java** (§12 step 8, §13) —
      `files-for-js-report/invoice-sample-payload.json` and the discounted variant.
- [x] `JsReportProperties` + `RestClient` bean + `JsReportRenderer`. Log
      `getResponseBodyAsString()` on a 400 — jsreport puts the template stack trace there, and
      without it template bugs are near-undebuggable (§9).
- [x] `PdfGenerationException` → **503**, not 500: the data is fine, the renderer isn't, and
      the client can retry.
- [x] `GET /invoices/{id}/pdf` with the ownership check *(customers use `/storefront/invoices/{id}/pdf`, scoped by the token)* (`hasRole('ADMIN') or
      @invoiceAccess.isOwner(...)`) — without it, changing `8` to `9` in the URL downloads a
      stranger's invoice.
- [x] `GET /reports/invoices/pdf`, `GET /reports/sales-by-category/pdf`.
- [ ] Receipt branch on the `document` template (`docType=RECEIPT` drops due date, balance and
      the status pill).
- [x] Wire the PDF buttons into `/reports` and the invoice detail page. Disable while in
      flight — a Chrome render takes a few hundred ms and a double-click renders twice.

**The `report` template must consume `columns[]`**, exactly as `ReportTable` and
`lib/report-cells.ts` already do. The `cell`/`totalCell` helpers in guide §8 are the direct
counterpart of `formatCell`/`formatTotalCell` — keep them in step or the PDF and the screen
will disagree.

- [ ] **Generate an invoice PDF once, then serve it from MinIO.** Not started. What the
      first look found:
      - **Private bucket, not the media one.** `minio-init` runs `mc anonymous set download`
        on `angkor-commerce-media`, so anything in it is public by URL. Invoice PDFs carry
        names, emails and phones → a separate bucket (e.g. `angkor-commerce-documents`) with
        no anonymous policy; add it to the `angkor-app-rw` policy in `minio-init`, to
        `MinioProperties`, and to `MinioBucketInitializer`.
      - **Key by content, not by id.** `invoices/{id}/{sha256(payload JSON + template version)}.pdf`.
        Any change — payment voided, cancellation, customer renamed — yields a new key, so
        there is no invalidation logic. A `template-version` property is bumped when the
        jsreport templates change. Old keys are orphaned; a lifecycle rule can sweep them.
      - **Only cache what time can't change.** Cache when `balance <= 0` or `CANCELLED`;
        render live otherwise — the template derives OVERDUE from today's date.
      - **Best-effort.** A MinIO miss or failure falls back to rendering; a failed put still
        returns the PDF. An `InvoicePdfService` in `invoice/` sits between both controllers
        and `JsReportRenderer`.
      - **Reports are not cached** — `generatedAt` and rolling periods make each render unique.
      - Tests: `@MockitoBean` the cache in `DocumentPdfEndpointTest`; unit-test hit / miss /
        unpaid-skips-cache / cache-down-falls-back.

---

## 12–13 — customer-scoped reports

- [ ] `GET /reports/my/statement`, `GET /reports/my/categories`, `/my/statement/pdf`.
- [ ] **Separate queries, not filtered views** (§4). The admin invoice report exposes every
      customer's name, phone and spend; that payload can never reach a customer. Scope comes
      from the token — never a `customerId` request param.
- [ ] Customer-portal statement page + per-invoice PDF/receipt download buttons.

---

## Testing still owed (§13)

- [x] A `CANCELLED` invoice renders its cancellation block
- [x] A long product title wraps rather than overflowing
- [ ] A KHR invoice — decimals disappear. *Open: `en-KH` prints `KHR 64,000.00` in both the
      portal's `formatMoney` and the template, so changing it means changing both.*
- [x] A 40-row report — page 2 renders and `<thead>` repeats
- [x] An empty report — the totals row still renders
- [x] Customer endpoint with another customer's invoice id → 404, not 200 (`DocumentPdfEndpointTest`)
- [x] `@MockitoBean JsReportRenderer` in integration tests so CI needs no jsreport

Already covered by `ReportReconciliationTest`: grand totals agree between the two reports,
category shares sum to 100, an invoice paid outside the window is excluded, manual lines are
grouped rather than dropped.

---

## Loose ends found along the way

- [ ] **Shared frontend package for the duplicated client code.** The PDF work added
      `apiFetchFile` + `DownloadedFile` to *both* `lib/api-client.ts` copies, and `saveFile`
      to both portals (`back-office-portal/src/shared/lib/download-file.ts`,
      `customer-portal/lib/download-file.ts`). Planned fix: a real pnpm workspace package
      (e.g. `packages/api-client`) taking the refresh path as config — not copying one
      portal's file into the other. Until then, change both copies together.

- [x] **`ApiApplicationTests.contextLoads` fails on the default profile.** It has no
      `@ActiveProfiles("dev")`, so `JwtTokenProvider`'s constructor throws on the missing JWT
      secret. Pre-existing, unrelated to reporting, and a one-line fix —
      `DashboardCategoryRollupTest` already carries the comment explaining it.
- [ ] **`report-module-build-guide.md` is superseded** by
      `documents-and-reporting-guide-update.md` (its frontmatter says so). Delete it or add a
      pointer at the top — it still describes `?period=last_2_months`, an `issue_date` basis
      and a `/reports/sales` endpoint, none of which exist any more.
- [x] ~~Root `AGENTS.md` has stale commands~~ — fixed by the `AGENTS.md` → `CLAUDE.md` merge.
- [ ] **`docs/learning-notes/03-why-flyway-sql-instead-of-jpa-entities.md` is stale.** It
      records a July 2026 switch *to* `ddl-auto=update`, but the project has since switched
      back: `application-dev.yml` sets `ddl-auto: validate` with Flyway `V1`–`V11`. Either
      add a second update block to the note or retire it. `CLAUDE.md` carries a warning
      pointing at this in the meantime.
- [ ] **Pre-existing lint errors**, untouched by this work: 4 errors in
      `src/features/team/` (`react/no-unescaped-entities`) and unused-import warnings in
      `dashboard-overview/lib/stats.ts`, `insights/analyze/route.ts`, `providers.tsx`.

---

## Open questions from §14 still unanswered

- [ ] Does the customer statement include cancelled orders, or paid only? Paid-only matches
      the admin report, but a customer looking for "what happened to that order" may expect
      the cancellation.
- [x] ~~Cache rendered PDFs in MinIO?~~ Decided yes — now a task under "jsreport and PDFs".
- [ ] A per-customer report. The old `/reports/sales` had a top-customers list; the new API
      has no per-customer grain, which is why the AI insights prompt lost its customer-
      concentration commentary. Adding `/reports/top-customers` would restore it and cost
      nothing on the portal side — the table and CSV already render any `columns[]`.
