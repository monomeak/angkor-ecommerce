<!-- BEGIN:nextjs-agent-rules -->
# Angkor Commerce — apps/back-office-portal

Frontend for Angkor Commerce. See [`docs/ANGKOR_COMMERCE_PROJECT_PROPOSAL.md`](../../docs/ANGKOR_COMMERCE_PROJECT_PROPOSAL.md) at the repo root for the project vision, roles, and architecture — treat it as the source of truth over this file for anything not covered here.

## Stack

Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Base UI, TanStack React Query 5, TanStack React Table 8, React Hook Form 7 + `@hookform/resolvers`, Zod 4, Recharts 3, Sonner, Lucide React. Auth, the product catalogue, the customer directory, invoices, the dashboard overview and reports now talk to the shared Spring Boot API (`apps/core-api`) through `lib/api-client.ts`; the profile feature is still on DummyJSON-shaped mock data and has not been ported yet.

## Structure and conventions

- Routes live in `app/`; feature code lives in `src/features/<feature>/` (`api/`, `components/`, `hooks/`, `lib/`, `mappers/`, `schemas/`, `types/`, `views/`). Keep `app` and `src` separate — don't move one under the other without a deliberate migration.
- Route pages compose feature views and stay small; feature views hold the logic.
- Data flow per feature: route page → view/component → React Query hook → API function → Zod validation/mapper → DummyJSON (Stage 1) or Spring Boot (Stage 2).
- UI components must not call DummyJSON (or any transport) directly — always go through a feature's API function.
- DummyJSON response shapes stay separate from domain types; validate external responses with Zod before mapping into domain objects.
- Query keys are owned by the feature that defines them.
- Config reaches the browser through `lib/env.ts` (server-side `process.env` parsing) → `lib/app-config.server.ts` (the public `AppConfig` shape) → `<AppConfigProvider>`. No `NEXT_PUBLIC_*`, so one build runs in every environment; secrets stay in `lib/env.ts` and must never enter `AppConfig`.
- `AppConfig` is only readable from a hook, so api functions take `apiBaseUrl` as their first argument and the calling hook supplies it via `useAppConfig()`. Never call `useAppConfig()` at module scope — it throws on import.
- URL search params are the source of truth for shareable list filters and pagination.
- Forms use React Hook Form + `zodResolver`. This replaced the earlier local-state + Zod approach when the catalogue landed: repeatable variant rows need `useFieldArray`, and PATCH-diffing needs `formState.dirtyFields`. Older features (profile, team) still use local state — port them when touched rather than in bulk.
- shadcn here is the Base UI (`base-nova`) registry: components take `render={<Component />}` rather than `asChild`, and there is no `form.tsx` — build forms from `field.tsx` (`Field`, `FieldLabel`, `FieldError`) plus React Hook Form.

## Current state (see proposal doc for details)

Implemented against core-api: login/logout/session via httpOnly cookies (`/auth/*`), the catalogue module under `src/features/catalog/` — `products/` (list with URL-param filters, sort and pagination; create; edit with PATCH diffing; variant rows; image upload; archive/restore), `categories/` (list, create, edit, delete) and `inventory/` (stock grouped per category card) — and `customers/` (read-only directory: search, status filter, sortable columns, pagination, details dialog).

The customer directory mirrors the product list deliberately: `lib/search-params.ts` + `hooks/use-customer-list-params.ts` are the same shape as the catalogue's, so filters, sort and page live in the URL and core-api does the work. Three things differ from products and are worth knowing:

- The search parameter is **`search`**, not `q` — that is what `/customers` has always taken.
- `GET /customers` and `GET /customers/{id}` return the *same* CustomerResponse, so one `Customer` type covers list rows and the details dialog; there is no summary/detail split like products have.
- The table is hand-rolled rather than TanStack Table (the catalogue's `ProductTable` is typed to `ProductSummary` and not shared); sortable headers are a local `SortableHead` component. `displayName` is computed in Java, not a column, so it cannot be sorted on — the Customer column sorts by `firstName`.

core-api has no admin write endpoints for customers (only the two GETs), so the directory is read-only by design, not by omission. Customers are created by storefront self-registration.

Invoices work the same way and for the same reason: core-api issues an invoice only when a payment is confirmed (`CheckoutServiceImpl`), so `src/features/invoices/` is a register and a receipt printer, not an invoice editor. `RecordPaymentRequest` and `CancelnvoiceRequest` exist as DTOs in core-api with no service method or controller behind them — recording a payment and cancelling an invoice are the next slice, not missing wiring on this side.

- A receipt is a document, so it has a URL: `/invoices/[invoiceId]` renders the full record and prints through `data-print-region` plus the `@media print` block at the bottom of `app/globals.css`. There is no print route and no details dialog.
- **There is no OVERDUE status in core-api** — `InvoiceMapper` has a note about it and no implementation. `lib/invoice-display.ts` derives it for the badge from `dueDate < today && balance > 0`, in Phnom Penh time so an invoice due today doesn't read as overdue. The status *filter* only offers what the API can filter on, which is why OVERDUE is absent from it.
- The list's date range params are named `issuedFrom`/`issuedTo`/`dueFrom`/`dueTo` in the URL but `issueDateFrom`/... on the wire — the short forms read better in a shared link. Only the **issued** range has a control: the due-date range is still parsed, sent and cleared, so a hand-written `?dueFrom=` works, but a second pair of date boxes was noise on the toolbar. `search` matches the invoice number or the customer's name, company or email.
- `src/features/invoices/mock/` is **gone**, deleted with the client-side aggregation it existed for when reports was ported. Its statuses (`paid | pending | overdue | draft`) were invented and never core-api's, so nothing in the app reports them any more.

The overview dashboard is one call — `GET /dashboard/overview?months=6` — behind all four of its widgets, because four aggregate queries in one transaction beat four endpoints the client has to assemble:

- KPI cards are **totals**, not trends: revenue (COMPLETED payments), outstanding (unpaid invoice balances), products on sale, customers, orders awaiting payment, invoices issued. Only revenue carries a change chip, computed from this month against last in the same series the chart draws — the other five have nothing honest to compare against, which is what the mock's invented percentages were doing.
- The revenue chart is **one** series. The old paid-vs-pending split was unanswerable: money is either received or it is an invoice balance, and a balance is not revenue. Outstanding is a KPI card instead.
- There are no "pending" or "overdue" invoice KPIs. core-api's statuses are ISSUED / PARTIALLY_PAID / PAID / CANCELLED, and overdue is a derived display state (see the invoices section).
- Money is summed across invoices and payments without grouping by currency — the shop trades in one, and `summary.currency` says which (`angkor.default-currency`). A second currency makes these totals meaningless and needs the API to group first.
- The mock fallback in `api/dashboard-api.ts` is gone: a dashboard that quietly shows invented numbers when the API is down is worse than one that says it could not load.

Reports is one generic screen over two core-api endpoints, `GET /reports/invoices` and `GET /reports/sales-by-category`, and adding a third report is a backend-only change:

- core-api ships `columns[]` **with** the data, so `ReportTable` and the CSV writer loop the columns and read each row by `column.key` rather than knowing any report's fields. `lib/report-cells.ts` is the screen twin of the `cell` helper in the jsreport template, so the PDF and the table cannot disagree about a column's meaning.
- Reports are **cash basis**: paid invoices only, counted in the period the money arrived (`invoices.paid_at`), not when they were issued. `basis` says so in the payload and in the CSV metadata rows.
- The phone column is `SUPER_ADMIN` only and is absent from `columns[]` entirely for a shop admin — not blanked out. Don't "fix" the table to show it.
- CSV exports the raw numbers from the payload already on screen, never a second request: a spreadsheet has to be able to sum the column, and `$1,083.50` is text.
- `?type=` and `?period=` are the URL source of truth, both validated on the way in so a hand-edited value falls back to the default instead of 400ing.

The analytics page feeds the AI those same two reports (`lib/to-insights-payload.ts`) — **aggregates only**, no invoice numbers, customer names or phone numbers. The old per-month `paid/pending/overdue/draft` prompt is gone with the mock that invented those statuses; the prompt now covers period totals and category concentration.

Still on mock data: landing page, appearance/privacy settings.

Team (`/team`) runs on `/users`: list, add (with a generated strong password), role change behind a confirm dialog, and deactivate — which is `PATCH /users/archive/{id}`, a soft delete to INACTIVE, not a removal.

Self-service registration is disabled: core-api's back-office `AuthController` has no `/register`, so `registerRequest()` throws a 501 with an explanation. Staff accounts come from the admin-only `POST /users`.

Auth tokens are server-issued `HttpOnly` cookies set by core-api on the API origin — the client never reads or stores them, and `apiFetch` sends them with `credentials: "include"`, refreshing once on a 401.

One caveat to know about `proxy.ts`: those cookies are host-only (no `Domain`), and cookies ignore ports, so in dev they reach the Next.js middleware. Once core-api moves to its own hostname they will not, and the route gate will stop seeing a session — at that point either scope the cookies to a shared parent domain or move the checks client-side.
<!-- END:nextjs-agent-rules -->
