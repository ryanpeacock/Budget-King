# Budget King — Architectural Decisions

This file records decisions that were made deliberately, with their rationale. Before suggesting an alternative approach to anything listed here, read the relevant entry. These are not defaults — they are choices.

---

## Frequency Divisors: ÷ 24 and ÷ 48, not ÷ 26 and ÷ 52

**Decision:** Weekly pay uses `amount_annual / 48`. Bi-weekly uses `amount_annual / 24`.

**Why:** The Blueprint is built around clean monthly reconciliation. Using ÷ 24 means exactly 2 bi-weekly paychecks equal the monthly column. Using ÷ 26 would leave users underfunded for monthly bills because 2 paychecks would come up short of the monthly amount.

**The trade-off:** Bi-weekly earners have 26 real paychecks per year, not 24. The 2 unplanned paychecks are surfaced in the Ledger as **bonus paychecks** — windfalls the user allocates intentionally. This is a product feature, not a gap.

**Do not change** the divisors to 52/26 "for accuracy." The inaccuracy is intentional and the Ledger is designed around it.

---

## Rounding: `Math.round(value * 100) / 100`, Never `.toFixed()`

**Decision:** All rounding uses `Math.round(value * 100) / 100`.

**Why:** `.toFixed()` returns a string and has known inconsistencies across JS engines for certain edge cases (e.g. `(1.005).toFixed(2)` returns `"1.00"` in some environments). The `Math.round` approach operates on numbers and is predictable.

**Effect:** Small per-paycheck rounding surpluses (e.g. a $12.99/month subscription rounds to $6.50 bi-weekly, accumulating $0.02/month) are intentional. These micro-surpluses accumulate as positive bucket balances in the Ledger.

---

## Money Storage: `NUMERIC(12,2)`, Never `FLOAT`

**Decision:** All monetary values in Postgres use `NUMERIC(12,2)`.

**Why:** Floating point cannot represent certain decimal values exactly. Financial software must not use `FLOAT` for money. `NUMERIC` is exact. `(12,2)` supports values up to $9,999,999,999.99 — sufficient for any personal finance use case.

**This applies everywhere:** schema definitions, Drizzle column types, any new table added in future phases.

---

## Single Source of Truth for Frequency Math

**Decision:** All frequency conversion functions live in `packages/shared/src/utils/frequency.ts`. Both the API and the web app import from there.

**Why:** If the math lives in two places, they will eventually drift. A bug fix in one place won't fix the other. During Blueprint creation, the frontend runs the math locally for instant feedback using the same functions the API uses on saved data.

**Do not** reimplement `toPerPaycheck`, `toMonthly`, or any other conversion inline in a component or controller. Import from `@budget-king/shared`.

---

## Blueprint Creation is Client-Side Until Save

**Decision:** The Blueprint creation playground makes zero API calls until the user explicitly hits Save. All state lives in React `useState`.

**Why:** The creation flow is exploratory. Users add, remove, and rearrange categories and expenses freely. Saving every keystroke to the API would be slow, complex, and wrong — the user hasn't committed to anything yet. The draft is not a real Blueprint until it's saved.

**Save behavior:** One `POST /blueprints` sends the complete draft. The API creates all rows (blueprint, income, categories, expenses) atomically in a single transaction. There is no partial save, no draft persistence, no autosave.

---

## Amount Stored as Annual, Displayed as Three Columns

**Decision:** Expenses store `amount_annual` as the single source of truth. Per-paycheck and monthly amounts are always derived, never stored.

**Why:** Storing derived values creates consistency problems — if frequency changes, all stored per-paycheck values become wrong. Storing only annual and computing the rest on read eliminates this class of bug entirely.

**During creation:** The user can type in any column (per-paycheck, monthly, or annual). The component converts to annual immediately and stores only that. The other two columns are derived for display.

**After saving:** The API computes and returns all three columns on every `GET /blueprints/:id`. The frontend displays what the API returns and never recomputes on saved blueprints.

---

## No Global Client-Side State Manager

**Decision:** No Zustand, Redux, Jotai, or React Context for data. TanStack Query is the only server state layer.

**Why:** The app has one authenticated user, one data domain (blueprints), and no cross-route shared UI state that couldn't be handled by URL params or local component state. Adding a global state manager would add complexity with no benefit. TanStack Query handles caching, invalidation, and background refresh — everything a state manager would do for server data.

**The only exception:** `useState` for local UI state (forms, modals, the Blueprint creation draft). This is not a state manager — it's component state.

---

## TanStack Router for Navigation State

**Decision:** Filter preferences, sort order, and any state that should survive a page refresh live in TanStack Router search params.

**Why:** URL-based state is shareable, bookmarkable, and doesn't need persistence logic. It also keeps the router as the authority on "where the user is and what they're looking at."

---

## Better Auth for Authentication

**Decision:** Better Auth is the auth library. Self-hosted, JWT access tokens (15 min), HttpOnly refresh token cookies (7 days, rotated on use).

**Why:** Avoids a third-party auth service (no vendor dependency, no per-user pricing). JWT is stateless — fits the stateless API requirement. HttpOnly cookies for refresh tokens prevent XSS from stealing them. Short access token expiry limits blast radius if a token is leaked.

**Do not** store the access token in localStorage. It goes in memory (or a React ref) and is refreshed via the HttpOnly cookie flow.

---

## Postgres in Docker, Everything Else Native

**Decision:** Postgres runs in Docker. The API runs via `tsx watch` and the web app runs via Vite natively. Nginx, PgBouncer, and a full application-layer Docker Compose are deferred until post-MVP.

**Why:** Postgres in Docker eliminates local installation differences between machines and makes a clean-slate reset trivial (`docker compose down -v`). The API and web app stay native to keep hot reload fast and avoid container networking complexity during development. Full infrastructure is deferred until the product is validated.

**Do not** Dockerize the API or web app during the MVP phase.

---

## Cascade Deletes at the Database Level

**Decision:** `ON DELETE CASCADE` is set on all child foreign keys. Deleting a blueprint deletes its income, categories, and expenses. Deleting a category deletes its expenses.

**Why:** Cascade at the DB level is reliable and doesn't depend on application logic running correctly. It also prevents orphaned rows if a future code path forgets to clean up. The application layer still verifies ownership before deleting — the cascade is a safety net, not a substitute for authorization.

---

## Blueprint Ownership Verified on Every Request

**Decision:** Every service function that reads or modifies a blueprint, category, or expense verifies that the blueprint's `user_id` matches the requesting user's ID.

**Why:** Never rely on "the user can only reach this route if they own the resource" — that assumption breaks the moment a bug exists in the frontend or a request is crafted manually. Authorization lives in the service layer, close to the data.
