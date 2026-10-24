# Interview Tips: Answering Open-Ended Questions About Angkor Commerce

## Common Open Questions

Recruiters and technical interviewers often ask questions like:

- "Walk me through how you built this project from start to finish."
- "How did you approach the architecture for this system?"
- "What was your process for planning and executing this work?"
- "How do you manage complexity in a project like this?"
- "What challenges did you face and how did you solve them?"

## Answer Framework: STAR + Context

Use **STAR (Situation, Task, Action, Result)** but adapted for full-project narrative:

### 1. Context / Situation (30 seconds)
- What is the project? Brief, one-sentence elevator pitch
- Why did you build it? Learning goal, problem being solved
- Scope: 3 apps, full-stack, e-commerce platform for Cambodia

**Example:**
> "Angkor Commerce is a full-stack e-commerce platform I built as a learning project to understand monorepo architecture and end-to-end payment flows. It has three applications: a Spring Boot API, a customer portal, and an admin portal, all integrated with ABA PayWay for Cambodian payments."

### 2. Planning / Task Management (1-2 minutes)
This is where you answer "how you accomplished it from start to end."

**Key points to cover:**

- **Two-stage approach**: Built the UI first against DummyJSON (Stage 1), then replaced with real backend (Stage 2)
- **Monorepo strategy**: pnpm/Turborepo for frontends, Maven for backend, clear separation of concerns
- **Documentation-first**: Proposal, API design docs, learning notes — wrote the plan before writing code
- **Incremental delivery**: One feature at a time migration from DummyJSON to core-api
- **Database migration discipline**: Flyway owns the schema, entities land with migrations
- **Testing approach**: Integration tests with Testcontainers, frontend lint/build as verification

**Example:**
> "I took a two-stage approach. First, I built the complete UI and auth flow against DummyJSON so the customer experience was solid before any backend existed. In Stage 2, I replaced DummyJSON with the Spring Boot API one feature at a time — products, then cart, then checkout, then payments.

> For task management, I used documentation as a planning tool. I wrote a proposal, API design specs, and learning notes before implementing. The monorepo uses pnpm/Turborepo for the Next.js portals and Maven for the API, which keeps dependencies coordinated. I used Flyway for database schema management with a rule that every entity change lands with a migration file — no auto-DDL in production. Verification is simple: backend changes trigger tests, frontend changes trigger lint and build."

### 3. Technical Decisions (1-2 minutes)
Highlight 2-3 significant decisions and the reasoning behind them.

**Good examples from this project:**

- **Ports over providers**: PaymentGatewayPort with adapters — wallet adapter for dev, ABA PayWay for production. Why? Credential-free local development and testability.
- **Cash-basis reporting**: Reports filter on `paid_at`, not `issue_date`. Why? Prevents revenue recognition errors, keeps self-correcting with void payments.
- **Aggregate queries via JdbcClient**: Reporting uses native SQL instead of JPA. Why? Reads tables directly across modules without entity imports, simpler for cross-module aggregates.
- **BigDecimal for money**: Never `double`. Why? Floating-point arithmetic errors are unacceptable for financial calculations.
- **Intent before call**: Persist PaymentIntent before calling gateway. Why? Server-side pushback is authoritative; the return URL from the user's browser is not.

**Example:**
> "One key decision was using a port-based design for payments. I defined a PaymentGatewayPort interface with adapters — a wallet adapter for development with no credentials, and an ABA PayWay adapter for production. This let me build and test the entire payment flow locally without needing real API keys.

> Another was choosing cash-basis reporting. Reports filter on `invoices.paid_at` rather than `issue_date`, which means only paid invoices contribute to revenue. Combined with a self-correcting design where voiding a payment moves an invoice from PAID to PARTIALLY_PAID, the reports stay accurate even when payments are adjusted later."

### 4. Challenges Faced (1 minute)
Pick 2-3 real challenges. Be honest about what was hard.

**Examples from this project:**

- **Jackson 3 migration**: `com.fasterxml.jackson` annotations ignored by `tools.jackson` databind in Spring Boot 4. Had to learn the new configuration approach.
- **Enum handling**: Query params don't go through Jackson, so case-insensitive enums needed a separate ConversionService configuration.
- **Pagination math**: Naive `skip / limit` math is wrong — had to implement OffsetPageable to get correct page boundaries.
- **Context startup failures**: `ddl-auto: validate` meant every entity field needed a matching DB column. Tight coupling between entity work and migration writing.

**Example:**
> "The biggest challenge was adapting to Spring Boot 4 and Jackson 3. The old Jackson annotations weren't being picked up by the new databind implementation, so I had to learn the new configuration approach in JacksonConfig. Similarly, enum query parameters weren't being handled case-insensitively because they bind through ConversionService, not Jackson — I had to add a WebConversionConfig to fix that.

> Another learning curve was the strict Flyway integration. With `ddl-auto: validate`, the context won't start if an entity field has no matching column. This meant I always had to write the migration alongside the entity, which slowed me down initially but prevented schema drift."

### 5. Results / Reflection (30 seconds)
- What you learned
- What you'd do differently
- What you're proud of

**Example:**
> "The result is a working e-commerce platform with real payments, reporting, and multi-language support. I learned a lot about monorepo coordination, payment gateway integration, and the trade-offs between JPA and native SQL for reporting. If I were starting over, I'd set up Testcontainers earlier — I initially ran tests against a local Postgres instance, which slowed down iteration. What I'm most proud of is the payment flow's robustness — the intent-before-call pattern and idempotency via unique indexes make it resilient to network failures and duplicate requests."

## Answer Structure Summary

**Total time: 4-5 minutes**

1. **Context** (30s): What, why, scope
2. **Planning** (1-2m): Two-stage approach, monorepo strategy, documentation-first, incremental delivery
3. **Technical decisions** (1-2m): 2-3 significant decisions with reasoning
4. **Challenges** (1m): 2-3 real problems and how you solved them
5. **Results** (30s): What you learned, what you'd change, what you're proud of

## Don'ts

- Don't recite the tech stack like a laundry list. Mention technologies in context of decisions.
- Don't over-explain the obvious. Interviewers know what React or Spring Boot is — they want to know *how* you used them.
- Don't fake expertise. If something was hard, say so. "I struggled with X, learned Y, here's how I solved it" is better than pretending it was trivial.
- Don't go into implementation details unless asked. Keep it at the architectural/decision level unless they drill down.
- Don't ramble. Practice the 4-5 minute target — if you're going longer, you're probably going too deep.

## Do's

- **Use numbers when they're meaningful**: "3 applications", "2 stages", "10+ migration files"
- **Reference documentation**: "I wrote learning notes as I went, so I could reference decisions later"
- **Show iteration**: "Stage 1 was the UI, Stage 2 replaced it with real APIs"
- **Highlight trade-offs**: "I chose X over Y because..."
- **Connect to business value**: "Cash-basis reporting prevents revenue recognition errors"

## Follow-Up Questions You Might Get

Be prepared for these after your initial answer:

- "Why Spring Boot instead of Node.js for the API?"
- "How did you handle authentication across the three apps?"
- "What's the hardest bug you fixed?"
- "How do you ensure database consistency?"
- "What would you scale first if this had real traffic?"

Have concrete answers ready for these, and they should be consistent with the decisions you described in your main answer.

## Tailoring to the Role

**For backend roles:** Emphasize the Spring Boot, Flyway, payment gateway, and reporting architecture. Talk about JPA vs native SQL, aggregate queries, and domain-driven design.

**For frontend roles:** Emphasize the Next.js App Router, React Query data flow, shadcn components, and multi-language support. Talk about URL search params as source of truth, Zod validation, and the feature-based structure.

**For full-stack roles:** Balance both. Highlight the monorepo coordination, the two-stage migration approach, and how you kept the API and frontends in sync through design docs.

## Practice Tips

- Record yourself answering and listen for rambling or jargon.
- Time yourself — aim for 4-5 minutes.
- Have 2-3 different "challenge" stories ready depending on what the interviewer seems interested in.
- Know your docs. If you wrote learning notes, reference them: "I documented this in my learning notes because it was a non-obvious gotcha."
