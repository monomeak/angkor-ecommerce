# CLAUDE.md

Context for working in the Angkor Commerce monorepo. `AGENTS.md` points here — this is the
only copy.

## What this is

A Cambodia-based e-commerce platform, built as a **personal learning project**, not a real
company's production app. Three apps in one repo:

| Path                      | What                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `apps/core-api`           | Spring Boot 4 / Spring Framework 7, base package `com.angkor.commerce` |
| `apps/customer-portal`    | Customer-facing Next.js App Router portal                            |
| `apps/back-office-portal` | Admin Next.js App Router portal                                      |

PostgreSQL with Flyway. MinIO for images. ABA PayWay (KHQR, Riel) for payments, with a
wallet adapter as the credential-free dev path.

> [!important] Some choices favour "understand the mechanism hands-on" over production best
> practice. Don't silently fix them toward conventional patterns — read
> `docs/learning-notes/` before assuming a decision was a shortcut, and say something if you
> think it's wrong rather than quietly correcting it.

It's being built in two stages. Stage 1 was a Next.js frontend against DummyJSON, so the UI
and auth flow existed before any backend. Stage 2 replaces DummyJSON with `apps/core-api`
one feature at a time — check what's actually ported before assuming an endpoint exists.

## How to work with me

- Terse and iterative. Skip preamble, skip restating the question.
- Prefer full implementations over scaffolds with `// TODO` holes.
- Prefer targeted changes over architectural expansions. Don't refactor adjacent code
  that wasn't asked about.
- Don't over-explain, but do explain _new_ concepts briefly — I'm learning while building.
- If a request is ambiguous, give the best answer first, then ask one question at the end.
- Push back when something is wrong. Don't defend prior output when I challenge it — revise.

Commits: one or two lines, no body unless it earns it.
GitHub issues: `Why / Scope / Decisions / Out of scope`.
Docs: Obsidian-flavoured markdown with callouts, written as a file.

## Hard rules

These are not preferences. Ask first, every time.

**Git**

- Never commit. Write the changes, tell me what you'd commit, and stop — I run `git commit`.
- Never push, and never force push under any circumstance.
- Never rewrite history: no `rebase`, no `reset --hard`, no `commit --amend`, no
  `checkout`/`switch` that would discard uncommitted work.
- Never create, delete, or merge branches on your own.
- Never `git add` files I didn't mention. No `git add -A`, no `git add .`.
- Never touch `.gitignore` to make something commit cleanly.
- Never add a `Co-Authored-By: Claude` or any other AI attribution trailer.
- Check `git status --short` before broad edits — never clobber unrelated working-tree
  changes, including by running a formatter over a directory.

**Database**

- Never edit a migration that has already been applied. Write a new one.
- Never run `DROP`, `TRUNCATE`, or an unfiltered `DELETE` / `UPDATE` against any database.
- Never run `flyway clean` or anything else that resets the schema.
- Show me destructive SQL before it runs, including in a scratch script.

**Secrets and config**

- Never read, write, or print `.env` files or anything else holding credentials.
- Never hardcode a key, password, or token — not even a placeholder that looks real.
- Never commit anything under `jsreport/data` that carries an admin password.

**Files and dependencies**

- Never delete files I didn't ask you to delete.
- Never add a dependency without asking. Say what you want and why first.
- Never bump a version in `pom.xml` or `package.json` as a side effect of another task.
- Never reformat or reorganise a file you were only asked to change one part of.

**Scope**

- Never refactor code that wasn't part of the request, even if it's clearly wrong. Tell me
  about it instead.
- Never mix a fix and a refactor in the same set of changes.
- If following an instruction would break something else, stop and say so rather than
  working around it silently.

## Repository boundaries

pnpm/Turborepo coordinates the frontends; Maven coordinates the backend. `pnpm-workspace.yaml`
lists only the two portals — **do not add `apps/core-api` to it.**

Frontend feature code lives in `apps/<portal>/src/features/<feature>/` with local `api/`,
`components/`, `hooks/`, `lib/`, `mappers/`, `schemas/`, `types/`, `views/` as needed. Routes
live in `app/` and stay small: pages compose feature views, views hold the logic. Keep `app`
and `src` separate.

Backend code is organised by domain package under `com.angkor.commerce`: `customer`,
`invoice`, `payment`, `product`, `order`, `dashboard`, `report`, `auth`, `user`, `security`,
`config`, `common`.

Each portal has its own `AGENTS.md` with rules specific to it — read it for frontend work.

## Commands

Frontend, from the repo root:

```bash
pnpm dev            # all apps
pnpm dev:back       # back-office on :4000
pnpm dev:customer
pnpm lint:back      pnpm build:back
pnpm lint:customer  pnpm build:customer
```

Backend, from `apps/core-api`:

```bash
./mvnw spring-boot:run
./mvnw test
./mvnw package
```

Infrastructure, from the repo root: `docker compose up -d postgres minio`.
Use `.env.example` as the template for local environment variables.

## Backend conventions

**Feature-based packages.** Each module owns its controller, service, `impl/`, repository,
entity, and `dto/request` + `dto/response`. Shared concerns live in `common/`, `security/`,
`config/`.

> Modules must not cross-import each other's repositories. If `order` needs customer data,
> go through the service interface.

- Service interface + `impl/` class. Controllers stay thin, constructor injection throughout.
- Entities extend `BaseEntity`. `TIMESTAMPTZ` columns with `set_updated_at()` triggers.
- DTOs are records, validated with Jakarta Validation. Never expose entities from an endpoint.
- Hand-written `@Component` mappers, not MapStruct — computed fields need inline logic.
- `BigDecimal` for money, never `double`.
- Aggregate queries use `JdbcClient` native SQL, not JPA — reporting reads *tables*, which is
  how it aggregates across three modules without importing their entities.
- Spring Security is the final authorization authority. Frontend role checks are UX only.
- When adding endpoints, update or verify the OpenAPI output at `/scalar` (Scalar UI over `/v3/api-docs`).

### Schema

**Flyway owns the schema.** `spring.jpa.hibernate.ddl-auto: validate`, so an entity field
with no matching column fails context startup — entity and migration land together.

The v0 squash has happened: `V1__baseline.sql` plus additive `V2`–`V11`. Add a new numbered
file for every change; never edit an existing one. Name it for the change, not the module
(`V11__reporting_cash_basis.sql`).

> [!warning] `docs/learning-notes/03-why-flyway-sql-instead-of-jpa-entities.md` is stale. It
> records a July 2026 switch *to* `ddl-auto=update`; the project has since switched back to
> Flyway. Trust the config over the note.

### API shape

DummyJSON-inspired. Collections keyed by resource name with offset pagination:

```json
{ "products": [], "total": 194, "skip": 0, "limit": 30 }
```

Single resources return the object directly — no success wrapper. Errors use one envelope
(`status`, `error`, `message`, `path`, `timestamp`).

Field naming: `title` not `name`, `stock` not `stockQuantity`. camelCase in JSON,
snake_case in the database. ISO 8601 dates, UTC storage.

### Framework gotchas — don't relearn these

- **Jackson 3**: `com.fasterxml.jackson` annotations are ignored by `tools.jackson` databind.
  Enum wire values come from `@JsonValue` on each enum; the mapper settings live in
  `config/JacksonConfig.java`, not in `application.yml`.
- **Query params don't go through Jackson.** They bind via the ConversionService, so
  case-insensitive enums need `config/WebConversionConfig.java`. A bad one throws
  `MethodArgumentTypeMismatchException`, which `GlobalExceptionHandler` maps to 400 —
  without that handler it falls to the catch-all and returns 500.
- **RestClient in Boot 4**: `ClientHttpRequestFactories` was removed. Use
  `JdkClientHttpRequestFactory` wrapping `HttpClient` directly.
- **`skip` pagination** needs an `OffsetPageable` implementation. Naive `skip / limit`
  page math is wrong.
- **Enums**: field declarations go _after_ the constants, or you get "enum constant expected".
- **Security config**: `permitAll` rules must precede role-based rules. `@EnableMethodSecurity`
  is required for method-level annotations.

## Frontend conventions

- Data flow per feature: route page → view/component → React Query hook → API function →
  Zod validation/mapper → transport. UI components never call a transport directly.
- External response shapes stay separate from domain types. Validate with Zod before mapping.
- Query keys are owned by the feature that defines them.
- Forms: `react-hook-form` + `zodResolver`, `useFieldArray` for repeatables. Older features
  (profile, team) still use local state — port them when touched, not in bulk.
- shadcn here is the Base UI (`base-nova`) registry: components take `render={<Component />}`
  rather than `asChild`, and there is no `form.tsx` — build forms from `field.tsx` plus RHF.
- URL search params are the source of truth for shareable filters, sorting and pagination.
  Validate on the way in: a hand-edited URL is untrusted input.
- Money via `Intl.NumberFormat` (`lib/formatters.ts`). The backend returns raw numbers;
  formatting is the frontend's job.
- Config reaches the browser through `lib/env.ts` → `AppConfig` → `<AppConfigProvider>`.
  No `NEXT_PUBLIC_*`; secrets stay in `lib/env.ts` and never enter `AppConfig`.
- Keep `messages/en.json` and `messages/km.json` in sync when adding user-facing copy.

## Design principles

**Make invalid states unrepresentable.** DB constraints are the last line of defence —
unique index on `invoice.order_id`, `OrderStatus.canTransitionTo()` gating transitions.

**Intent before call.** Persist the `PaymentIntent` before calling the gateway.
Server-to-server pushback is authoritative settlement; the return URL is not.

**Idempotency via DB unique indexes**, not application-layer checks alone.

**Ports over providers.** `PaymentGatewayPort` with adapters — that's what lets the wallet
run as a dev path with no credentials.

**YAGNI.** Don't write a branch the domain can't reach.

Keep scratch and test files out of production source.

## Domain rules worth knowing

- **Invoices are pay-first.** No draft stage, no overdue job, no manual creation. A
  `SUPER_ADMIN` recovery hatch exists.
- **`InvoiceStatus` is `ISSUED` / `PARTIALLY_PAID` / `PAID` / `CANCELLED`.** `PARTIALLY_PAID`
  *is* reachable and the branch is written: voiding a payment moves an invoice `PAID →
  PARTIALLY_PAID`, which is what makes reports self-correct. There is no `OVERDUE` — the
  back office derives it for display from `dueDate < today && balance > 0`.
- **Invoice numbering is gapless** via a DB sequence.
- **Line items snapshot from the order** — title, price, sku, and category — never re-read
  from the product. A price or category rename must not rewrite history.
- **Checkout** resolves prices server-side and reserves stock. The client is never trusted
  to calculate totals.
- **Reports are cash basis, paid invoices only** — filter on `invoices.paid_at`, not
  `issue_date`. `refreshPaymentState` is the single place that stamps and clears it.
- **One currency per report request.** Every money figure is scoped to `?currency=`, because
  50 USD + 50,000 KHR is not a number.

## Testing and verification

Run the smallest useful check before finishing:

- Backend change: `cd apps/core-api && ./mvnw test`
- Frontend change: `pnpm lint:back`, plus `pnpm build:back` when behaviour or types changed
- Cross-stack: both
- Docs only: no test run

Backend tests are JUnit 5 with AssertJ. Spring tests need `@ActiveProfiles("dev")` — the
default profile has no JWT secret, so the context cannot start on it. Integration tests use
Testcontainers via the package-private `TestcontainersConfiguration`, which is why they live
in the root `com.angkor.commerce` test package.

If a verification command can't run — no Docker, no network, no local services — say so
plainly in the final response rather than claiming it passed.

## Open items

- `ProductVariant` backend contract — the product model is currently flat
- Whether true `PATCH` is implemented backend-side
- Reconciliation job for stuck payment intents
- jsreport integration for invoice, receipt, and report PDFs — see
  `docs/reporting/REMAINING_TASKS.md`

## Documentation sources

- `README.md` — proposal-style overview and roadmap
- `docs/ANGKOR_COMMERCE_PROJECT_PROPOSAL.md` — fuller proposal and architecture
- `docs/learning-notes/` — why each backend decision was made (see the Flyway caveat above)
- `docs/api-design-draft/` — data model, endpoints, payments
- `docs/reporting/` — the reporting and documents build guide
- `apps/<portal>/AGENTS.md` — portal-specific frontend rules

When docs disagree with code, treat the code as current, then update the doc or say so.

## Environment

VS Code on Mac. Maven for the API, Next.js CLI for the frontends. MinIO and PostgreSQL via
Docker Compose.
