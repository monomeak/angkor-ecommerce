# Angkor Commerce — Implementation Inventory

> Read-only survey of what is actually implemented in this repository, produced to
> back a GitHub milestone and issue breakdown. Everything below was verified by
> reading source files; nothing is inferred from naming.
>
> **Surveyed:** 2026-08-05, branch `feature/core-api-product-managemen` (clean tree,
> HEAD `690fa06`).

**Scope surveyed:** `apps/core-api` (Spring Boot 4.0.7, Java 21), `apps/back-office-portal` (Next.js), `apps/customer-portal` (Next.js). Branch `feature/core-api-product-managemen` (branch name itself is misspelled), clean tree.

---

## 1. Package tree under `apps/core-api/src/main/java/com/angkor/commerce`

| Package | Contents | State |
|---|---|---|
| `auth` | 2 controllers, 2 service interfaces + impls, 2 token entities + repos, 9 DTOs, `shared/` (cookie service, token crypto), `StrongPassword` | Implemented |
| `category` | Controller, service + impl, entity, repo, 4 DTOs | Implemented |
| `product` | Controller, service + impl, `entities/` (3), `repositories/` (3), `mapper/`, `specificaion/`, 6 request + 6 response DTOs | Implemented |
| `customer` | Controller, service + impl, entity, repo, 2 DTOs (1 empty) | Read-only slice |
| `user` | Controller, service + impl, entity, `Role`, repo, 4 DTOs | Implemented |
| `common` | `ApiConstants`, `BaseEntity`, `dto/` (PageResponse, OffsetPageable), `enums/`, `exception/` (5), `logging/`, `storage/` (11 + `minio/` 4) | Implemented |
| `security` | `SecurityConfig`, `JwtAuthenticationFilter`, `JwtTokenProvider`, `CustomUserDetailsService`, entry point, access-denied handler | Implemented |
| `config` | Cors, Jackson, Jpa (auditor), OpenApi | Implemented |
| `order` | `Order`, `OrderItem`, `OrderStatus` entities only — **11 of 14 files are 0 bytes** | Scaffold only |
| `invoice` | `Invoice`, `InvoiceItem`, `InvoiceStatus` entities only — **11 of 14 files are 0 bytes** | Scaffold only |
| `payment` | `Payment`, `PaymentMethod`, `PaymentStatus` only — **6 of 10 files are 0 bytes** | Scaffold only |
| `audit` | `AuditLog` only — **5 of 7 files are 0 bytes** | Scaffold only |
| `dashboard` | **All 5 files are 0 bytes** | Empty |
| `report` | **All 4 files are 0 bytes** | Empty |

**No `cart` package and no address/`customer_addresses` package exist anywhere.** 42 Java files are literally zero bytes (full list verified by `wc -c` over `apps/core-api/src`).

---

## 2. Layer coverage per module

| Module | Entity | Repo | Svc iface | Svc impl | Controller | DTOs |
|---|---|---|---|---|---|---|
| auth (staff) | ✅ RefreshToken | ✅ | ✅ | ✅ | ✅ | ✅ |
| auth (customer) | ✅ CustomerRefreshToken | ✅ | ✅ | ✅ | ✅ | ✅ |
| category | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| product | ✅ ×3 | ✅ ×3 | ✅ | ✅ | ✅ | ✅ + mapper + spec |
| user | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| customer | ✅ | ✅ | ✅ (2 methods) | ✅ | ✅ (2 GETs) | ⚠️ `CustomerSummaryResponse` is an empty class |
| order | ✅ ×2 | ❌ empty | ❌ empty | ❌ empty | ❌ empty | ❌ empty |
| invoice | ✅ ×2 | ❌ empty | ❌ empty | ❌ empty | ❌ empty | ❌ empty |
| payment | ✅ | ❌ empty | ❌ empty | ❌ empty | ❌ empty | ❌ empty |
| audit | ✅ | ❌ empty | ❌ empty | ❌ empty | ❌ empty | ❌ empty |
| dashboard / report | — | — | ❌ empty | ❌ empty | ❌ empty | ❌ empty |
| **cart** | ❌ none | ❌ | ❌ | ❌ | ❌ | ❌ |
| **shipping address** | ❌ none (only denormalized `shipping_*` columns on `Order`) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. REST endpoints (read from controllers)

Auth rules come from [SecurityConfig.java:25-85](../apps/core-api/src/main/java/com/angkor/commerce/security/SecurityConfig.java#L25-L85); `@PreAuthorize` noted where present.

### `AuthController` — `/api/v1/auth`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/login` | public | `LoginRequest` | `AuthenticatedUserResponse` + Set-Cookie ×2 |
| POST | `/refresh` | public | cookie `refreshToken` | `AuthenticatedUserResponse` |
| POST | `/logout` | authenticated | cookie `refreshToken` (required) | 204 |
| GET | `/me` | authenticated | — | `CurrentUserResponse` |
| PATCH | `/me` | authenticated (falls to `anyRequest`) | `UpdateProfileRequest` | `CurrentUserResponse` |
| PUT | `/me/image` | authenticated (falls to `anyRequest`) | multipart part `image` | `UserResponse` |

### `StorefrontAuthController` — `/api/v1/storefront/auth`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/register` | public | `RegisterCustomerRequest` | `AuthenticatedCustomerResponse` |
| POST | `/login` | public | `CustomerLoginRequest` | `AuthenticatedCustomerResponse` |
| POST | `/refresh` | public | cookie | `AuthenticatedCustomerResponse` |
| POST | `/logout` | authenticated | cookie (required) | 204 |
| GET | `/me` | authenticated | — | `CurrentCustomerResponse` |
| PATCH | `/me` | authenticated (`anyRequest`) | `UpdateCustomerProfileRequest` | `CurrentCustomerResponse` |
| PUT | `/me/image` | authenticated (`anyRequest`) | multipart part `image` | `CurrentCustomerResponse` |

### `CategoryController` — `/api/v1/categories`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `` | **permitAll** | — | `List<CategoryFullResponse>` |
| GET | `/{id}` | **permitAll** | — | `CategoryFullResponse` |
| POST | `` | SUPER_ADMIN, SHOP_ADMIN | `CreateCategoryRequest` | 201 `CategoryFullResponse` |
| PUT | `/{id}` | SUPER_ADMIN, SHOP_ADMIN | `UpdateCategoryRequest` | `CategoryFullResponse` |
| DELETE | `/{id}` | SUPER_ADMIN, SHOP_ADMIN | — | `CategoryFullResponse` |

### `ProductController` — `/api/v1/products`

**No SecurityConfig rule; all fall through to `anyRequest().authenticated()`.**

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `` | authenticated only | `CreateProductRequest` | 201 `ProductResponse` + Location |
| GET | `` | authenticated only | `ProductQueryParams` (query) | `PageResponse<ProductSummaryResponse>` |
| GET | `/{id}` | authenticated only | — | `ProductResponse` |
| PATCH | `/{id}` | authenticated only | `UpdateProductRequest` | `ProductResponse` |
| DELETE | `/{id}` | `@PreAuthorize` SHOP_ADMIN, SUPER_ADMIN | — | `ProductDeleteResponse` |
| POST | `/{id}/variants` | authenticated only | `CreateProductVariantRequest` | 201 `ProductVariantResponse` |
| PATCH | `/{id}/variants/{variantId}` | authenticated only | `UpdateProductVariantRequest` | `ProductVariantResponse` |
| DELETE | `/{id}/variants/{variantId}` | authenticated only | — | 204 |
| POST | `/{id}/images` | authenticated only | multipart `file` + `displayOrder` | 201 `ProductImageResponse` |
| DELETE | `/{id}/images/{imageId}` | authenticated only | — | 204 |

### `UserController` — `/api/v1/users` — SUPER_ADMIN, SHOP_ADMIN (path rule)

GET `` (`skip`,`limit`,`search`) → `PageResponse<UserResponse>` · GET `/{id}` → `UserResponse` · POST `` (extra `@PreAuthorize` blocking SHOP_ADMIN from creating SUPER_ADMIN) → 201 `UserResponse` · PATCH `/{id}` → `UserResponse` · PATCH `/archive/{id}` → `UserResponse`

### `CustomerController` — `/api/v1/customers` — **authenticated only** (class is package-private)

GET `` (`skip`,`limit`,`search`) → `PageResponse<CustomerResponse>` · GET `/{id}` → `CustomerResponse`

**No product-image serving endpoint exists** — `ImageStorageService.resolveUrl()` is implemented but never called; responses return raw MinIO object keys.

---

## 4. Cross-cutting concerns

**GlobalExceptionHandler** — 11 handlers, all implemented: `ResourceNotFoundException`→404, `ValidationException`→400 (+field map), `MethodArgumentNotValidException`→400, `DataIntegrityViolationException`→409, `BadCredentialsException`→401, `AuthenticationException`→401, `AccessDeniedException`→403, `InvalidImageException`→400, `ImageStorageException`→502, `NoResourceFoundException`→404, `HttpMessageNotReadableException`→400, `StorageException`→500, `Exception`→500. Not handled: `jakarta.validation.ValidationException` (thrown in two places — see bugs).

**Security config** — `JwtAuthenticationFilter` (cookie-based, `accessToken`, no DB hit), `HttpRequestLoggingFilter`, `RestAuthenticationEntryPoint`, `CustomAccessDeniedHandler`, CSRF disabled, stateless, `@EnableMethodSecurity`. JWT: HS256, `typ` claim splits staff/customer, `uid` + `role`; refresh tokens are opaque random strings stored hashed with rotation-on-refresh. Public paths: `/actuator/health`, `/actuator/info`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, storefront `register`/`login`/`refresh`, `/v3/api-docs/**`, `/scalar`, `/scalar/**`, plus `GET /api/v1/categories/**`.

**File/object storage** — Fully implemented against MinIO: `MinioImageStorageService` (upload, uploadBytes, delete, deleteQuietly, exists, resolveUrl), `MinioBucketInitializer` (creates bucket on startup), `ImageValidator` (size + content-type — **no magic-byte check despite the comment at `ProductServiceImpl.java:210` claiming one**), `ThumbnailGenerator` (Thumbnailator, 400×400 @0.8), `ImageObjectKeyFactory`, `StorageCleanup` (commit/rollback hooks), `ImageReplacementListener` (after-commit old-image delete). Nothing stubbed; one hook is non-functional (see bugs).

**Scheduled jobs** — **None.** No `@Scheduled` or `@EnableScheduling` anywhere. `RefreshTokenRepository.deleteAllExpiredBefore`, `revokedAllForUser`, and both customer equivalents are declared but never called from any code path.

**Migrations** — Flyway, 4 scripts, `ddl-auto: validate` in both dev and prod. `V1__baseline.sql` (~625 lines: users, refresh_tokens, customers, customer_refresh_tokens, categories, products, product_variants, product_images, orders, order_items, invoices, invoice_items, payments, audit_logs — all with triggers, checks, partial unique indexes), `V2__add_customer_image.sql`, `V3__seed_categoties.sql` (22 categories + `setval`), `V4__rename_product_title.sql`. Per the project's migration strategy, these are still edited in place pre-MVP.

---

## 5. Test coverage

**Effectively zero.** `src/test` contains exactly 3 files:

- `ApiApplicationTests.java` — a single `contextLoads()` with no assertions
- `TestcontainersConfiguration.java` — Postgres container bean (`postgres:latest`, unpinned)
- `TestApiApplication.java` — dev-mode launcher

No unit tests, no `@WebMvcTest`, no `@DataJpaTest`, no integration tests for **any** module. Test-scoped dependencies (security-test, webmvc-test, data-jpa-test, testcontainers) are in the POM but unused.

---

## 6. Status by area

### Auth — **PARTIAL**

- [x] Staff login (`POST /auth/login`), cookie-based
- [x] Staff refresh with token rotation + revocation
- [x] Staff logout
- [x] Staff current user (`GET /auth/me`)
- [x] Staff profile update + avatar upload
- [x] Customer register / login / refresh / logout / me / profile update / avatar
- [ ] Staff self-registration — no `POST /auth/register`; staff are created via `POST /users`
- [ ] Password reset / forgot-password — nothing in the API
- [ ] Password change — no endpoint on either flow
- [ ] Expired-refresh-token cleanup job
- [ ] Any test

### Category management — **DONE (with one behavioural caveat)**

- [x] List (public, flat, sorted)
- [x] Get by id (public)
- [x] Create with slug-uniqueness + parent validation + gap-of-10 sort ordering
- [x] Update with slug/self-parent guards
- [x] Delete, admin-gated
- [ ] "Archive" is a **hard delete** despite the name and the project's stated soft-delete rule
- [ ] Cycle detection beyond self-parent (A→B→A is allowed)
- [ ] Tests

### Product catalogue — **PARTIAL**

- [x] Create product with variants (SKU uniqueness in-request and in-DB)
- [x] List with pagination, sort whitelist, category/price/size/stock/text filters via `Specification` + `OffsetPageable`
- [x] Get by id with variants + images + computed totals
- [x] Update product fields
- [x] Soft delete (`status = DELETED`)
- [x] Add / update / delete variant (last-variant guard)
- [x] Upload image with thumbnail generation, cap of 10, thumbnail promotion on delete, orphan cleanup on thumbnail failure
- [x] Delete image
- [ ] Images at product-creation time — code is commented out at [ProductServiceImpl.java:94-97](../apps/core-api/src/main/java/com/angkor/commerce/product/impl/ProductServiceImpl.java#L94-L97); `buildImages()` and `ProductImageRequest` are now dead
- [ ] Any authorization beyond "logged in" on write endpoints (except DELETE)
- [ ] Public/storefront read access
- [ ] Image URL resolution in responses
- [ ] Reorder images
- [ ] Tests

### Cart — **NOT STARTED**

- [ ] Entity / repository / service / controller / DTOs — none exist
- [ ] No `carts` or `cart_items` table in any migration
- [x] Cart lives entirely client-side in customer-portal `localStorage` (`cart-context.tsx`), which the schema comments state is a deliberate decision

### User profile & shipping addresses — **PARTIAL**

- [x] Staff self-profile read/update/avatar
- [x] Customer self-profile read/update/avatar
- [x] Staff user CRUD (list, get, create, update, archive) with role-waterfall rules
- [x] Customer list/get for back-office
- [ ] **Shipping addresses: no entity, no table, no endpoint.** Only denormalized `shipping_*` columns on `orders`, and `Order` has no service/controller
- [ ] Customer address book — exists only as customer-portal `localStorage`

### Back office endpoints — **PARTIAL**

- [x] Users (5 endpoints), Customers (2 endpoints), Categories (5), Products (10)
- [ ] Dashboard — all files empty
- [ ] Reports — all files empty
- [ ] Invoices — all files empty
- [ ] Orders — all files empty
- [ ] Payments — all files empty
- [ ] Audit log — all files empty

### File storage — **DONE**

- [x] MinIO client + config properties + bucket auto-creation
- [x] Upload from multipart and from bytes
- [x] Validation (size ≤5MB, JPEG/PNG/WebP)
- [x] Thumbnail generation
- [x] Deterministic object keys by purpose/entity
- [x] Delete, quiet bulk delete, exists
- [x] Old-image cleanup via transactional event
- [ ] Rollback cleanup — registered but non-functional (guard inverted)
- [ ] `resolveUrl` wired into any response

### Exception handling — **DONE**

- [x] 13 handlers covering domain, bean-validation, Jackson, security, storage, and catch-all
- [x] Consistent `ErrorResponse` shape with optional field-error map
- [ ] `jakarta.validation.ValidationException` unmapped → those paths return 500

### Web frontend — **PARTIAL**

**customer-portal** (Next.js App Router, 19 routes, 21 feature folders):

- [x] Home, search, product list/detail, login, signup, checkout, confirmation, shipping, account (profile, orders, favorites, payment methods, change password)
- [x] Cart, orders, addresses, payment methods — all `localStorage`
- [ ] **Zero API integration.** `product-api.ts` and `account-api.ts` resolve against local mock arrays; the file comment says "No backend yet"

**back-office-portal** (Next.js, i18n, 22 routes):

- [x] Login/register/forgot-password forms, overview dashboard, customers, invoices, reports, team, analytics/insights, settings, role-gated routing proxy
- [ ] **Still pointed at `https://dummyjson.com`** (`.env` → `NEXT_PUBLIC_API_BASE_URL`); `auth-api.ts` posts `expiresInMins`, `customer-api.ts` calls `/users/search`, `profile-api.ts` returns a hardcoded dummy object
- [ ] **Catalogue pages are placeholders** — `catalog/products`, `catalog/categories`, `catalog/inventory` each return a single `<h1>` and nothing else

---

## Bugs and inconsistencies found

### Logic

1. [StorageCleanup.java:55](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/StorageCleanup.java#L55) — inverted guard: `if (!keys.isEmpty() || isSynchronizationActive()) return;`. The method returns whenever there *are* keys, so rollback cleanup **never registers**. Every `onRollback(...)` call site (product image upload, both avatar uploads) leaks orphaned objects on rollback. Compare the correct form at line 30-36.
2. [CategoryServiceImpl.java:105-109](../apps/core-api/src/main/java/com/angkor/commerce/category/impl/CategoryServiceImpl.java#L105-L109) — `archiveCategory` calls `categoryRepository.delete(category)`, a hard delete. `Category` has no `status` field, so archiving is not possible; `DELETE /categories/{id}` will also fail with FK violation once products reference it (`ON DELETE RESTRICT`).
3. [ProductQueryParams.java:71](../apps/core-api/src/main/java/com/angkor/commerce/product/dto/request/ProductQueryParams.java#L71) and [ThumbnailGenerator.java:32](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/ThumbnailGenerator.java#L32) throw `jakarta.validation.ValidationException`, not the app's `common.exception.ValidationException`. Neither is handled → 500 instead of 400. An invalid `?sortBy=` returns "An unexpected error occurred".
4. [ProductQueryParams.java:68](../apps/core-api/src/main/java/com/angkor/commerce/product/dto/request/ProductQueryParams.java#L68) — `String field = "name".equals(sortBy) ? "name" : sortBy;` is a no-op. The comment says "API exposes `title`, entity field is `name`", but `sortBy=title` is rejected by the whitelist.
5. [UserServiceImpl.java:49](../apps/core-api/src/main/java/com/angkor/commerce/user/impl/UserServiceImpl.java#L49) and [CustomerServiceImpl.java:41](../apps/core-api/src/main/java/com/angkor/commerce/customer/impl/CustomerServiceImpl.java#L41) — `skip` is converted to a page number by integer division, so any `skip` that isn't a multiple of `limit` silently returns the wrong offset while echoing the requested `skip`. Products avoid this via `OffsetPageable`. Also the `safeLimit == 0` branch is unreachable (line above forces ≥30).
6. [AuthController.java:96](../apps/core-api/src/main/java/com/angkor/commerce/auth/AuthController.java#L96) / [StorefrontAuthController.java:98](../apps/core-api/src/main/java/com/angkor/commerce/auth/StorefrontAuthController.java#L98) — `@AuthenticationPrincipal` is typed to one principal record, but both endpoints are only gated on `authenticated()`. A customer token hitting `/api/v1/auth/me` injects `null` → NPE → 500 (and vice versa).
7. [HttpRequestLoggingFilter.java:25-33](../apps/core-api/src/main/java/com/angkor/commerce/common/logging/HttpRequestLoggingFilter.java#L25-L33) — six arguments passed to a format string with four `{}` placeholders; remote address and User-Agent are silently dropped.
8. [ImageValidator.java:27](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/ImageValidator.java#L27) — message renders as `mage must not exceed5242880 MB`: typo, missing space, and bytes labelled MB.
9. [ResourceNotFoundException.java:12](../apps/core-api/src/main/java/com/angkor/commerce/common/exception/ResourceNotFoundException.java#L12) — missing space produces `User with id 5was not found`.
10. [CreateUserRequest.java:20](../apps/core-api/src/main/java/com/angkor/commerce/user/dto/request/CreateUserRequest.java#L20) — `lastName`'s `@Size` message reads "First name must be at most 100 characters".

### Authorization

11. [SecurityConfig.java:66-85](../apps/core-api/src/main/java/com/angkor/commerce/security/SecurityConfig.java#L66-L85) — `/api/v1/products/**` has no rule and falls to `anyRequest().authenticated()`. A logged-in storefront customer (`ROLE_CUSTOMER`) can create, update, add variants to, and upload/delete images on any product. Only `DELETE /products/{id}` carries `@PreAuthorize`.
12. Same file — `/api/v1/customers/**` also falls to `anyRequest().authenticated()`, so any authenticated customer can list every customer's name, email, phone, tax number and image.
13. Same file — catalogue browsing (`GET /products`) requires authentication, which contradicts the public-catalogue intent stated in the `CategoryController` comment and the `CORE_API_ENDPOINTS.md` reference.
14. [UpdateProfileRequest.java:12](../apps/core-api/src/main/java/com/angkor/commerce/auth/dto/request/UpdateProfileRequest.java#L12), [UpdateCustomerProfileRequest.java:12](../apps/core-api/src/main/java/com/angkor/commerce/auth/dto/request/UpdateCustomerProfileRequest.java#L12), [UpdateUserRequest.java:14](../apps/core-api/src/main/java/com/angkor/commerce/user/dto/request/UpdateUserRequest.java#L14) — all accept a raw `image` string, letting a client set an arbitrary object key alongside the multipart upload endpoints.

### Misspelled identifiers

15. `AuthenticatedUser(Long id, String usernmae, String role)` — [JwtAuthenticationFilter.java:89](../apps/core-api/src/main/java/com/angkor/commerce/security/JwtAuthenticationFilter.java#L89); the typo propagates to the call site at [AuthController.java:97](../apps/core-api/src/main/java/com/angkor/commerce/auth/AuthController.java#L97).
16. `ApiConstants.PRODUCES_BASE` — [ApiConstants.java:13](../apps/core-api/src/main/java/com/angkor/commerce/common/ApiConstants.java#L13) (should be `PRODUCTS_BASE`).
17. Package `com.angkor.commerce.product.specificaion` — [ProductSpecification.java:1](../apps/core-api/src/main/java/com/angkor/commerce/product/specificaion/ProductSpecification.java#L1).
18. `ImageStorageService.delet(...)` — [ImageStorageService.java:11](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/ImageStorageService.java#L11), impl [MinioImageStorageService.java:65](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/minio/MinioImageStorageService.java#L65), caller [ImageReplacementListener.java:20](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/ImageReplacementListener.java#L20).
19. `updateProfleImage` — [AuthService.java:16](../apps/core-api/src/main/java/com/angkor/commerce/auth/AuthService.java#L16), [CustomerAuthService.java:18](../apps/core-api/src/main/java/com/angkor/commerce/auth/CustomerAuthService.java#L18), impls at lines 199 and 202.
20. `updateMeyImage` — [AuthController.java:109](../apps/core-api/src/main/java/com/angkor/commerce/auth/AuthController.java#L109).
21. `aggragateByProductIds` — [ProductVariantRepository.java:33](../apps/core-api/src/main/java/com/angkor/commerce/product/repositories/ProductVariantRepository.java#L33).
22. `getAccessTokenTtlMininutes()` — [JwtTokenProvider.java:111](../apps/core-api/src/main/java/com/angkor/commerce/security/JwtTokenProvider.java#L111), a duplicate of `getAccessTokenTtlMinutes()` at line 37. Neither is called.
23. `EXTENSTIONS` — [ImageValidator.java:13](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/ImageValidator.java#L13); `"Failed to generate thumbail"` — [ThumbnailGenerator.java:34](../apps/core-api/src/main/java/com/angkor/commerce/common/storage/ThumbnailGenerator.java#L34).
24. `RefreshTokenRepository.revokedAllForUser` — [RefreshTokenRepository.java:17](../apps/core-api/src/main/java/com/angkor/commerce/auth/RefreshTokenRepository.java#L17) (customer twin is correctly `revokeAllForCustomer`).
25. `hakari` should be `hikari` — [application-dev.yml:9](../apps/core-api/src/main/resources/application-dev.yml#L9) and [application-prod.yml:9](../apps/core-api/src/main/resources/application-prod.yml#L9); dev additionally has `pool-namea`. Both pool-config blocks are inert.
26. Migration filename `V3__seed_categoties.sql`. Renaming it after it has been applied will break Flyway's checksum/description match.

### Field-naming inconsistencies for the same concept

27. Product title: `CreateProductRequest.name` → entity `Product.name` → `ProductResponse.name`, but `UpdateProductRequest.title` ([UpdateProductRequest.java:13](../apps/core-api/src/main/java/com/angkor/commerce/product/dto/request/UpdateProductRequest.java#L13), mapped to `setName` at `ProductServiceImpl.java:106`) and `ProductSummaryResponse.title` ([ProductSummaryResponse.java:8](../apps/core-api/src/main/java/com/angkor/commerce/product/dto/response/ProductSummaryResponse.java#L8)). Three names for one field across the create/update/list contracts.
28. Thumbnail: entity/`ProductResponse` use `thumbnailUrl`; `ProductSummaryResponse.thumbnail` ([line 16](../apps/core-api/src/main/java/com/angkor/commerce/product/dto/response/ProductSummaryResponse.java#L16)).
29. Category: `ProductResponse.category` is a `CategoryResponse` object; `ProductSummaryResponse.category` is a bare `String` name.
30. DB index `idx_products_title` still references the pre-rename column name after `V4__rename_product_title.sql` (cosmetic; Postgres keeps the index working).

---

## Work started but unfinished

1. **Order / Invoice / Payment / Audit modules** — entities and enums written and full tables exist in `V1__baseline.sql`, but every repository, service, impl, controller and DTO file was created and left at 0 bytes (39 files).
2. **Dashboard and Report modules** — 9 files, all 0 bytes. The back-office `overview` and `reports` pages already exist in the UI expecting this data.
3. **Product images at creation time** — `CreateProductRequest.images` field commented out ([line 33](../apps/core-api/src/main/java/com/angkor/commerce/product/dto/request/CreateProductRequest.java#L33)), the `buildImages` call commented out ([ProductServiceImpl.java:94-97](../apps/core-api/src/main/java/com/angkor/commerce/product/impl/ProductServiceImpl.java#L94-L97)), leaving `buildImages()` (line 333) and the whole `ProductImageRequest` DTO unreferenced.
4. **Configurable limits** — `angkor.product.max_images: 5` is declared in [application-dev.yml:43](../apps/core-api/src/main/resources/application-dev.yml#L43) but never read; the code uses a hardcoded non-final `private static int MAX_IMAGES_PER_PRODUCT = 10` with the comment "load from property instead" ([ProductServiceImpl.java:57-58](../apps/core-api/src/main/java/com/angkor/commerce/product/impl/ProductServiceImpl.java#L57-L58)). `ThumbnailGenerator` carries a `//[HACK]: load from properties or env instead later` for the same reason, and `ImageValidator` a `// load from env later`.
5. **Two dead avatar-upload paths** — `AuthServiceImpl.updateProfleImage` (line 199) is fully implemented but `AuthController` calls `userService.updateImage` instead, so it is unreachable. The two implementations differ: `UserServiceImpl.updateImage` (line 195) omits the `StorageCleanup.onRollback` call the other has.
6. **Unused repository queries** — `findActiveById`, `findActiveWithCategoryId`, `findByCategoryId`, `existsByIdAndStatusNot` on `ProductRepository`; `deleteAllExpiredBefore` and the revoke-all queries on both token repositories. No scheduled job or logout-everywhere flow calls them.
7. **`CustomerSummaryResponse`** — declared as an empty class (`customer/dto/response/CustomerSummaryResponse.java`); `UserSummaryResponse` is defined but never referenced.
8. **`RefreshRequest` DTO** — body-based refresh DTO left over from before the cookie migration; no controller uses it.
9. **`ProductController` scaffolding leftovers** — `///  start here...` at line 37, and a wrong-package `@Validate` from `org.simpleframework.xml.core` (line 20/33), which is an XML-serialization annotation that does nothing here. It compiles because `simpleframework` arrives transitively via MinIO.
10. **Commented-out constructors** — `AuthServiceImpl.java:52-70` and `CustomerServiceImpl.java:27-29`, superseded by `@RequiredArgsConstructor`.
11. **Back-office catalogue UI** — routes, layout and sidebar nav shipped (commit `694aede`), pages themselves are one-line placeholders.
12. **Frontend/API integration overall** — both portals predate the API. Back-office still targets `dummyjson.com`; customer-portal has no HTTP layer at all. `MinioImageStorageService.resolveUrl` exists precisely for this and is uncalled.
13. **Test suite** — testcontainers and four Spring test starters wired into the POM, one placeholder `contextLoads()` test written, nothing since.

---

## Not verified statically

Two things could not be confirmed by reading alone:

- Whether `GlobalExceptionHandler`'s `com.fasterxml.jackson.*` cause-matching (lines 144-151) actually fires under Spring Boot 4 — `JacksonConfig` uses the Jackson 3 `tools.jackson` API, so the `InvalidFormatException`/`MismatchedInputException` branches may never match at runtime and fall through to the default message. It compiles, so both artifacts are on the classpath; confirming needs a running request.
- Whether `V1`'s DDL fully satisfies `ddl-auto: validate` against every current entity — products/variants/images/customers were spot-checked and match, but all 14 tables were not diffed.
