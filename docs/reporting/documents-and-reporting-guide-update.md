---
title: Documents and reporting — implementation guide
project: Angkor Commerce
modules:
  - invoice
  - report
status: draft
created: 2026-09-05
supersedes:
  - reporting-feature-plan
  - jsreport-integration-guide
tags:
  - angkor-commerce
  - core-api
  - jsreport
  - reporting
  - pdf
---

# Documents and reporting — implementation guide

Everything that produces a document or a report, for both the back-office portal and the
customer portal, rendered through one jsreport service.

Supersedes [[reporting-feature-plan]] and [[jsreport-integration-guide]].

---

## 1. What ships

Four document types, two audiences, **two jsreport templates**.

| # | Document | Audience | Template | Data |
|---|---|---|---|---|
| 1 | Invoice | Customer + admin | `document` | `InvoiceResponse` |
| 2 | Receipt | Customer | `document` | `InvoiceResponse` + `docType` |
| 3 | Sales report | Admin | `report` | `ReportResponse` |
| 4 | Product report | Admin | `report` | `ReportResponse` |

Plus the customer-scoped variants of 3 and 4, which reuse the same template with
different SQL.

> [!note] Why only two templates
> A receipt is an invoice that drops due date and balance and leads with the payment.
> The two reports already share the `ReportResponse` envelope, so one table template
> driven by `columns[]` renders both — and a third report later costs a SQL query and
> nothing else.

### Naming

We settled the ambiguity: **"sales report" is the per-invoice transaction listing**,
**"product report" is sales grouped by category**. The document titles say so plainly
so nobody has to guess:

- *Invoice report* — one row per paid invoice
- *Sales by category* — one row per category

---

## 2. Architecture

```text
Back-office portal              Customer portal
        │                              │
        │  Bearer token                │  Bearer token
        ▼                              ▼
     ┌──────────────────────────────────────┐
     │              core-api                │
     │  • authenticate                      │
     │  • scope the query to the caller     │
     │  • build InvoiceResponse /           │
     │    ReportResponse                    │
     └──────────────────┬───────────────────┘
                        │  POST /api/report
                        ▼
                    jsreport
              handlebars → chrome-pdf
                        │
                        ▼
                    PDF bytes
```

> [!important] The browser never talks to jsreport
> jsreport has no idea who is logged in. If the frontend calls it directly, anyone who
> guesses an id downloads a stranger's document. `core-api` sits in front so the
> ownership check happens once, in the service that already knows how to do it.
> jsreport listens on the internal Docker network only — no published port in production.

---

## 3. Reporting rules

These govern every report, admin and customer alike.

> [!important] Cash basis, paid invoices only
> Filter on `invoice.paid_at`, **not** `issue_date`. An invoice issued in August and
> paid in September belongs to September. This is the only way the numbers reconcile
> against the bank.

| Decision | Value | Why |
|---|---|---|
| Basis | Cash | Matches the pay-first invoice design |
| Status filter | `PAID` only | `ISSUED` is momentary, `CANCELLED` earns nothing |
| Invoice report grain | One row per invoice | Auditable — a row traces back to a real invoice number |
| Category source | Snapshot on the invoice line | A category rename must not rewrite old reports |
| Totals | Own query, whole period | Never summed from the returned page |
| Customer count | `COUNT(DISTINCT customer_id)` | Rows repeat per customer |
| Currency | Raw numbers from the API | Formatting belongs to the client |

### Period presets

| Filter | Purpose |
|---|---|
| This month (to date) | How the current month is tracking — the default view |
| Last 3 months | Quarterly performance; spot a recent dip or a category picking up |
| Last 6 months | Separates a real trend from one good or bad month |
| Last 12 months | Accounting and tax; the only range that shows seasonality |

> [!tip] Resolve presets server-side
> Presets are relative to today, so a saved file is undatable without resolved dates.
> `startDate` / `endDate` go in the PDF header and as a `#` comment row in the CSV.
> Label the first one "to date" so nobody compares half a month against a full one.

> [!warning] Three ways to get wrong numbers
> 1. **Summing the visible page.** Page totals are not period totals.
> 2. **Inner join to `product`.** A deleted product silently drops its lines and shrinks
>    revenue. Join on snapshotted line data, or left join.
> 3. **Mixed currency.** `SUM(line_total)` across USD and KHR invoices adds dollars to
>    riel. See the open question in §12.

---

## 4. Data contracts

### `ReportResponse`

One envelope for every report. The table component, the CSV writer, and the jsreport
template all consume this shape.

```java
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

public record ReportColumn(
    String key,
    String label,
    Align align,
    Format format
) {
    public enum Align { LEFT, RIGHT }
    public enum Format { TEXT, NUMBER, MONEY, PERCENT, DATE }
}
```

`columns[]` is what makes one template serve every report. The template loops columns
for the header, then loops rows reading `row[column.key]`.

```json
{
  "reportType": "invoices",
  "title": "Invoice report",
  "startDate": "2026-07-01",
  "endDate": "2026-09-30",
  "basis": "cash",
  "currency": "KHR",
  "generatedAt": "2026-09-05T14:22:00+07:00",
  "columns": [
    { "key": "invoiceNumber", "label": "Invoice",  "align": "LEFT",  "format": "TEXT" },
    { "key": "paidAt",        "label": "Paid",     "align": "LEFT",  "format": "DATE" },
    { "key": "customerName",  "label": "Customer", "align": "LEFT",  "format": "TEXT" },
    { "key": "totalItems",    "label": "Items",    "align": "RIGHT", "format": "NUMBER" },
    { "key": "totalDiscount", "label": "Discount", "align": "RIGHT", "format": "MONEY" },
    { "key": "total",         "label": "Total",    "align": "RIGHT", "format": "MONEY" }
  ],
  "rows": [],
  "totals": { "label": "5 customers", "totalItems": 23, "totalDiscount": 62300, "total": 1083500 }
}
```

### Report variants

| Report | Columns | Totals |
|---|---|---|
| Invoice report (admin) | invoice no, paid date, customer id, name, phone, items, discount, total | distinct customers, items, discount, grand total |
| Sales by category (admin) | category, units sold, discount, revenue, share | category count, units, discount, grand total, 100% |
| Statement (customer) | invoice no, paid date, items, discount, total | invoice count, items, discount, grand total |
| My purchases by category (customer) | category, units, spend | category count, units, total spend |

> [!danger] The customer variants are different queries, not filtered views
> The admin invoice report exposes every customer's name, phone, and spend. That page
> can never reach a customer. Same for sales by category — store-wide revenue is your
> business data. The customer versions drop those columns and scope to one person.

---

## 5. API surface

```http
# Documents
GET /api/v1/invoices/{id}/pdf          # invoice — admin or owner
GET /api/v1/invoices/{id}/receipt      # receipt — owner

# Admin reports
GET /api/v1/reports/invoices?period=last_3_months
GET /api/v1/reports/sales-by-category?period=last_3_months
GET /api/v1/reports/invoices/pdf?period=last_3_months
GET /api/v1/reports/sales-by-category/pdf?period=last_3_months

# Customer reports
GET /api/v1/reports/my/statement?period=last_3_months
GET /api/v1/reports/my/categories?period=last_3_months
GET /api/v1/reports/my/statement/pdf?period=last_3_months
```

`period` accepts `this_month`, `last_3_months`, `last_6_months`, `last_12_months`.

The JSON endpoint and its `/pdf` sibling call the same service method. The PDF endpoint
just hands the result to jsreport instead of serializing it.

---

## 6. Security

> [!danger] Never accept `customerId` from the request on customer endpoints
> ```java
> // right — scope comes from the token
> Long customerId = principal.getCustomerId();
>
> // wrong — an enumeration bug waiting to happen
> public ReportResponse statement(@RequestParam Long customerId) { ... }
> ```
> One missed validation hands out everyone's purchase history. **Separate endpoints**
> under `/my/` are safer than one endpoint with a role branch inside, because the scope
> is structural rather than conditional.

| Endpoint | Access |
|---|---|
| `/invoices/{id}/pdf` | `ADMIN`, or the owning customer |
| `/invoices/{id}/receipt` | The owning customer |
| `/reports/**` | `ADMIN` |
| `/reports/invoices` (phone column) | See below |
| `/reports/my/**` | Authenticated customer, scoped from token |

> [!warning] Phone numbers in exports
> The admin invoice report CSV carries customer phone numbers. That file gets emailed
> around and ends up on laptops. Either restrict it to `SUPER_ADMIN`, or omit the phone
> column for plain `ADMIN`. Pick one and write it down — the decision is easy to forget
> and impossible to undo once the file is out.

Ownership check for documents:

```java
@GetMapping(value = ApiConstants.INVOICE_PDF, produces = MediaType.APPLICATION_PDF_VALUE)
@PreAuthorize("hasRole('ADMIN') or @invoiceAccess.isOwner(#id, authentication)")
public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) { ... }
```

Without it, changing `8` to `9` in the URL downloads a stranger's invoice.

---

## 7. Running jsreport

### `docker-compose.yml`

```yaml
services:
  jsreport:
    build: ./jsreport          # custom image — fonts, see §11
    container_name: angkor-jsreport
    restart: unless-stopped
    environment:
      store:provider: fs
      extensions:authentication:cookieSession:secret: ${JSREPORT_COOKIE_SECRET}
      extensions:authentication:admin:username: ${JSREPORT_USER}
      extensions:authentication:admin:password: ${JSREPORT_PASSWORD}
      extensions:express:inputRequestLimit: 10mb
      chrome:launchOptions:args: --no-sandbox,--disable-dev-shm-usage
    volumes:
      - ./jsreport/data:/app/data
    networks: [angkor]
    # no ports: — internal only

  core-api:
    environment:
      JSREPORT_URL: http://jsreport:5488
      JSREPORT_USER: ${JSREPORT_USER}
      JSREPORT_PASSWORD: ${JSREPORT_PASSWORD}
    depends_on: [jsreport]
    networks: [angkor]
```

> [!warning] `--no-sandbox` is required in Docker
> Chrome refuses to start as root in a container without it. Safe here only because
> jsreport renders your own templates. Never pass raw user HTML into a template.

> [!tip] Publish 5488 in dev only
> A `docker-compose.override.yml` publishing `5488:5488` gives you jsreport Studio at
> `localhost:5488` for live template editing. Keep it out of the production file.

### Templates on disk

The `fs` store treats each folder as a template. Commit `jsreport/data/` — it is source
code, not runtime state.

```text
jsreport/
├── Dockerfile
└── data/
    ├── shared/
    │   ├── layout.html          ← page frame, brand block
    │   └── helpers.js           ← money, formatDate, statusLabel, methodLabel
    ├── document/                ← invoice + receipt
    │   ├── config.json
    │   └── content.html
    └── report/                  ← every report
        ├── config.json
        └── content.html
```

`config.json` (same for both, different `name`):

```json
{
  "name": "document",
  "engine": "handlebars",
  "recipe": "chrome-pdf",
  "chrome": {
    "format": "A4",
    "marginTop": "0", "marginBottom": "0",
    "marginLeft": "0", "marginRight": "0",
    "printBackground": true
  }
}
```

> [!note] Why zero Chrome margins
> The template's `.sheet` class owns its padding. Letting Chrome add margins on top
> means two sources of truth and a layout that shifts when someone changes either one.

---

## 8. Templates

### `document` — invoice and receipt

Already drafted as `invoice-template.handlebars`. The receipt branch:

```handlebars
{{#eq docType "RECEIPT"}}
  <p class="doc-title">Receipt</p>
  <div class="meta">Paid {{formatDate payments.0.paymentDate}} · order #{{orderId}}</div>
{{else}}
  <p class="doc-title">{{invoiceNumber}}</p>
  <div class="meta">Issued {{formatDate issueDate}} · due {{formatDate dueDate}}</div>
{{/eq}}
```

A receipt omits the due date, the balance row, and the status pill. Everything else —
line items, totals, payments — is identical.

### `report` — all four reports

Driven entirely by `columns[]`, so it never names a specific report:

```handlebars
<div class="sheet">
  <div class="head">
    <div>
      <p class="doc-title">{{title}}</p>
      <div class="meta">
        {{formatDate startDate}} – {{formatDate endDate}} · paid invoices only · {{currency}}
      </div>
    </div>
    <div class="brand">
      <p class="brand-name">Angkor Commerce</p>
      <p class="brand-sub">Generated {{formatDate generatedAt}}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        {{#each columns}}
        <th class="{{lower align}}">{{label}}</th>
        {{/each}}
      </tr>
    </thead>
    <tbody>
      {{#each rows as |row|}}
      <tr>
        {{#each ../columns as |col|}}
        <td class="{{lower col.align}}">{{cell row col ../../currency}}</td>
        {{/each}}
      </tr>
      {{/each}}
      <tr class="totals-row">
        {{#each columns as |col|}}
        <td class="{{lower col.align}}">{{totalCell ../totals col ../currency}}</td>
        {{/each}}
      </tr>
    </tbody>
  </table>
</div>
```

Two extra helpers on top of the document ones:

```js
function cell(row, col, currency) {
  const v = row[col.key];
  if (v === null || v === undefined) return '';
  switch (col.format) {
    case 'MONEY':   return money(v, currency);
    case 'PERCENT': return `${Number(v).toFixed(1)}%`;
    case 'DATE':    return formatDate(v);
    default:        return String(v);
  }
}

function totalCell(totals, col, currency) {
  if (col.key === 'label' || totals.label && col === firstColumn) return totals.label;
  return totals[col.key] === undefined ? '' : cell(totals, col, currency);
}
```

> [!tip] The first totals cell carries the label
> "5 customers" / "4 categories" sits in the first column of the totals row. Everything
> else in that row is a number or blank.

---

## 9. `core-api` implementation

Packages: `com.angkor.commerce.report`, `com.angkor.commerce.invoice.pdf`

### Config

```yaml
jsreport:
  url: ${JSREPORT_URL:http://localhost:5488}
  username: ${JSREPORT_USER}
  password: ${JSREPORT_PASSWORD}
  timeout: 30s
```

```java
@ConfigurationProperties(prefix = "jsreport")
public record JsReportProperties(String url, String username, String password, Duration timeout) {}
```

### RestClient bean

```java
@Bean
RestClient jsReportClient(JsReportProperties props) {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout((int) props.timeout().toMillis());
    factory.setReadTimeout((int) props.timeout().toMillis());

    return RestClient.builder()
            .baseUrl(props.url())
            .requestFactory(factory)
            .defaultHeaders(h -> h.setBasicAuth(props.username(), props.password()))
            .build();
}
```

### Renderer

One renderer for all four document types — the template name is the only variable.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class JsReportRenderer {

    private final RestClient jsReportClient;

    public byte[] render(String template, Object data) {
        try {
            return jsReportClient.post()
                    .uri("/api/report")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_PDF)
                    .body(Map.of("template", Map.of("name", template), "data", data))
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientResponseException ex) {
            log.error("jsreport render failed [{}] — {} {}",
                    template, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new PdfGenerationException("Could not generate the document", ex);
        } catch (ResourceAccessException ex) {
            log.error("jsreport unreachable [{}]", template, ex);
            throw new PdfGenerationException("The document service is unavailable", ex);
        }
    }
}
```

> [!warning] jsreport returns 400 with a useful body
> A broken helper or missing field comes back as HTTP 400 with the stack trace in the
> response body. Log `getResponseBodyAsString()` — without it you get "render failed"
> and nothing else, and template bugs become very hard to find.

### Report queries

Native SQL via `JdbcClient`. These are aggregates with no entity graph to hydrate — JPA
buys nothing and gets in the way of `GROUP BY`.

```sql
-- sales by category
SELECT il.category,
       SUM(il.quantity)        AS units_sold,
       SUM(il.discount_amount) AS discount,
       SUM(il.line_total)      AS revenue
FROM invoice_line il
JOIN invoice i ON i.id = il.invoice_id
WHERE i.status = 'PAID'
  AND i.paid_at >= :start
  AND i.paid_at <  :end
GROUP BY il.category
ORDER BY revenue DESC
```

`share` is computed from the grand total in Java, not in SQL.

The customer variant adds one clause and nothing else:

```sql
  AND i.customer_id = :customerId
```

### Controller

```java
@GetMapping(value = "/reports/invoices/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<byte[]> invoiceReportPdf(@RequestParam ReportPeriod period) {

    ReportResponse report = reportService.invoiceReport(period);
    byte[] pdf = renderer.render("report", report);

    String filename = "invoice-report-%s_%s.pdf".formatted(report.startDate(), report.endDate());

    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition.attachment().filename(filename).build().toString())
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
}
```

### Error handling

```java
@ExceptionHandler(PdfGenerationException.class)
ResponseEntity<ErrorResponse> handlePdf(PdfGenerationException ex, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ErrorResponse.of(503, "Service Unavailable", ex.getMessage(), req));
}
```

503, not 500 — the data is fine, the renderer is not, and the client can retry.

---

## 10. Frontend

### Back-office `/reports`

- [ ] Report type switch — invoice report / sales by category
- [ ] Period selector at the top, applying to the table and both exports at once
- [ ] Table renders `columns[]` + `rows[]` + `totals` — same generic component as the template
- [ ] CSV export client-side from the same payload, no second request
- [ ] PDF export hits the `/pdf` endpoint

### Customer portal

- [ ] Statement page under the account section, same period presets
- [ ] Download buttons on each invoice — PDF and receipt

> [!warning] Empty state wording
> "No invoice data yet" reads like the app is broken. Always name the resolved period:
> *"No paid invoices between 1 Jul and 30 Sep 2026."*

Disable download buttons while the request is in flight — a Chrome render takes a few
hundred milliseconds and a double-click renders twice.

CSV metadata rows:

```csv
# Angkor Commerce — invoice report
# period,2026-07-01,2026-09-30
# basis,cash (paid invoices only)
# currency,KHR
```

Excel shows these as junk rows, but they are the only way a downloaded file explains
itself a year later. Drop them if the accountant complains.

---

## 11. Gotchas

> [!danger] Khmer fonts in the container
> The base jsreport image ships a thin font set. Khmer product titles render as empty
> boxes, and it looks like a template bug rather than a missing font.
> ```dockerfile
> FROM jsreport/jsreport:4.7.0
> USER root
> RUN apt-get update && apt-get install -y fonts-noto-khmer fonts-noto-core \
>     && rm -rf /var/lib/apt/lists/*
> USER jsreport
> ```

> [!warning] Timezone
> Helpers format dates in `Asia/Phnom_Penh`. The container defaults to UTC, so an
> invoice paid at 03:36 UTC would print as the previous day. The helper pins the zone
> explicitly — don't remove that argument.

> [!note] Payment method label
> The sample sends `paymentMethod: "OTHER"` with `referenceNumber: "WALLET-27"`, and the
> frontend infers "Wallet balance" from the prefix. The template falls back to the same
> guess, so the logic now lives in two places. Fix it at the source: add `WALLET` to the
> enum, or return `paymentMethodLabel` on the payment DTO.

> [!note] Empty `items` array
> The sample payload had `"items": []` while the rendered PDF showed a line item. If the
> list endpoint omits items and only the detail endpoint includes them, the PDF service
> must call the detail path — otherwise you ship invoices with no line items.

> [!note] Browser-print artifacts
> Your current PDF carries `9/5/26, 9:27 PM` in the header and `localhost:4000/invoices/8`
> in the footer. Those are print artifacts. jsreport renders no page header or footer, so
> they disappear — but pick a real document title, because the current one is the browser
> tab title bleeding through.

> [!tip] Multi-page tables
> Chrome repeats `<thead>` across pages for real table elements. Test a 40-row report
> before a customer finds out for you.

---

## 12. Build order

1. [ ] Confirm `invoice_line` snapshots `category`; add a migration if not
2. [ ] `ReportPeriod` enum + resolver
3. [ ] `ReportResponse`, `ReportColumn`
4. [ ] `ReportQueryRepository` — two admin queries via `JdbcClient`
5. [ ] `ReportService` + admin JSON endpoints
6. [ ] Back-office `/reports` page with the table and CSV export
7. [ ] jsreport container, fonts, `shared/helpers.js`
8. [ ] `document` template — render both sample payloads in Studio before touching Java
9. [ ] `JsReportRenderer` + invoice PDF endpoint
10. [ ] `report` template + report PDF endpoints
11. [ ] Receipt branch
12. [ ] Customer-scoped queries and `/my/` endpoints
13. [ ] Customer portal statement page

Steps 1–6 deliver a working report tool with no jsreport at all. Everything after that
is documents.

---

## 13. Testing

- [ ] Both sample payloads render in Studio before any Java is written
- [ ] A `CANCELLED` invoice — the cancellation block appears
- [ ] A long product title — wraps rather than overflowing
- [ ] A KHR invoice — decimals disappear
- [ ] A 40-row report — page 2 renders, header repeats
- [ ] An empty report — totals row still renders, no crash
- [ ] Customer endpoint with another customer's invoice id → 403, not 200
- [ ] Grand totals match between the invoice report and sales by category for the same period
- [ ] `@MockBean JsReportRenderer` in integration tests so CI needs no jsreport

---

## 14. Open questions

- [ ] **Single currency or mixed?** The sample invoice is USD; reporting assumed KHR. If
      both exist, every report total must group by currency. Hardest thing here to
      retrofit — decide first.
- [ ] Does `InvoiceItemResponse` carry `sku`? The template renders it, inferred from the
      printed PDF.
- [ ] Does the customer statement include cancelled orders, or paid only? Paid-only
      matches the admin report, but a customer looking for "what happened to that order"
      may expect to see the cancellation.
- [ ] Phone column: `SUPER_ADMIN` only, or omitted for plain `ADMIN`?
- [ ] Cache rendered PDFs in MinIO? A paid invoice never changes, so the render is
      repeatable waste — but only worth it once downloads get frequent.
