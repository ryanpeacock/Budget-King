# Budget King — Project Specification (MVP)

## MVP Scope

The MVP delivers the Blueprint end-to-end: creation, viewing, and editing. Auth is included because it's required to persist data. The Ledger is fully designed and deferred to the next build phase.

**What's in the MVP:**
- User authentication (register, login, logout)
- Blueprint creation playground (client-side, no API calls until save)
- Saved Blueprint view with three-column expense display
- Blueprint editing (rename, add/edit/delete categories and expenses)
- Zero-based tracker
- Two pay frequencies: Weekly (÷ 48) and Bi-Weekly (÷ 24) — built for clean monthly reconciliation, with bonus paycheck handling designed for the Ledger

**What's deferred:**
- The Ledger (buckets, accounts, transactions, transfers)
- Semi-monthly pay frequency (paycheck estimation logic, surplus routing)
- Variable / contract pay frequency (Income Reserve, draw mechanics)
- Docker, Nginx, PgBouncer, and production infrastructure
- CI/CD pipeline

**Local development only** — no Docker during the MVP phase. Postgres runs directly, the API runs via `tsx watch`, and Vite runs its dev server. Deploy when the product is validated.

---

## 1. Core Concepts

| Concept | Description |
|---|---|
| **Blueprint** | A zero-based budget plan built around one paycheck |
| **Category** | A user-defined label that groups expenses within a Blueprint |
| **Expense** | A line item under a Category, stored as an annual amount |

Ledger, Bucket, Account, and Transaction are defined in the full spec and will be built in the next phase.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | SPA, auth-gated |
| Routing | TanStack Router | File-based, type-safe route params, route loaders |
| Server State | TanStack Query | Owns all data fetched from the API |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/vite` plugin — no PostCSS config needed |
| UI Components | shadcn/ui | Copied into `src/components/ui/`, owned and editable — not a node_modules import |
| Backend | Node.js + Express | REST API, TypeScript |
| Database | PostgreSQL | Run directly locally — no Docker during MVP |
| ORM | Drizzle ORM | Schema-as-code, explicit query builder, migration support |
| Auth | Better Auth | Self-hosted, JWT + refresh tokens |
| Language | TypeScript | End-to-end, shared types via monorepo |

**Deferred infrastructure:** Nginx, PgBouncer, DigitalOcean, CI/CD. (Docker is used locally for Postgres only — see docker-compose.yml at repo root.)

### Local Dev Setup

```
# Terminal 1 — Postgres (Docker)
docker compose up -d

# Terminal 2 — API
cd apps/api && tsx watch src/index.ts

# Terminal 3 — web
cd apps/web && vite
```

DATABASE_URL in apps/api/.env: `postgresql://budgetking:budgetking@localhost:5432/budgetking`

### State Management Philosophy

> **TanStack Query owns all server state. TanStack Router owns URL/navigation state. React `useState` handles local UI state. These never overlap.**

- No global client state manager
- Blueprint creation draft lives entirely in `useState` — nothing persisted until the user saves
- Filter and sort preferences live in TanStack Router search params

---

## 3. Monorepo Structure

```
budget-king/
├── apps/
│   ├── web/                        # React SPA (Vite)
│   └── api/                        # Express API (Node.js)
├── packages/
│   └── shared/
│       ├── types/
│       │   ├── blueprint.ts        # Blueprint, BlueprintDraft, Category, CategoryDraft
│       │   └── expense.ts          # Expense, ExpenseDraft, ComputedExpense
│       └── utils/
│           └── frequency.ts        # Pay frequency math — single source of truth
└── pnpm-workspace.yaml
```

The shared package exists for two concrete reasons: TypeScript types are defined once and used by both the API and the web app, and the frequency math lives in one place. When a response shape changes, TypeScript errors surface immediately on both sides.

---

## 4. Blueprint Draft Types

```typescript
// packages/shared/types/blueprint.ts

export type FrequencyType = 'weekly' | 'biweekly'
// semimonthly and variable are defined in the full spec — deferred to post-MVP

export type DraftExpense = {
  id: string              // client-generated: crypto.randomUUID()
  name: string
  amountAnnual: string    // string during editing, parsed to number on save
  sortOrder: number
}

export type DraftCategory = {
  id: string
  name: string
  sortOrder: number
  expenses: DraftExpense[]
}

export type BlueprintDraft = {
  name: string
  frequency: FrequencyType | null
  incomeAmount: string
  categories: DraftCategory[]
}

export const emptyDraft = (): BlueprintDraft => ({
  name: '',
  frequency: null,
  incomeAmount: '',
  categories: [],
})
```

---

## 5. Frontend Architecture

### Directory Structure

```
apps/web/src/
├── routes/
│   ├── __root.tsx                  # Root layout, auth guard
│   ├── login.tsx
│   ├── dashboard.tsx               # Blueprint list (simple list for MVP)
│   └── blueprint/
│       ├── new.tsx                 # Blueprint creation playground
│       └── $blueprintId.tsx        # Saved blueprint detail + editing
│
├── components/
│   ├── blueprint/
│   │   ├── BlueprintEditor.tsx     # Shared editor — used by new.tsx and $blueprintId.tsx
│   │   ├── CategorySection.tsx     # Category header + expense rows
│   │   ├── ExpenseRow.tsx          # Single expense, 3-column display
│   │   ├── ZeroBasedTracker.tsx    # Running balance → zero indicator
│   │   └── FrequencyBadge.tsx
│   └── ui/                         # shadcn/ui components live here — owned, editable
│       ├── button.tsx              # Seeded by shadcn init
│       ├── Input.tsx               # Custom — see Task 4.4
│       ├── Modal.tsx               # Custom — see Task 4.4
│       └── CurrencyDisplay.tsx     # Custom — see Task 4.4
│
├── api/
│   └── blueprints.ts               # All TanStack Query hooks for blueprints
│
└── lib/
    ├── queryClient.ts
    └── auth.ts
```

Ledger components (`BucketCard`, `TransactionList`, `TransactionForm`, `BucketTransfer`, `AccountSummary`) are defined in the full spec and will be built post-MVP.

### Key Frontend Rules

- Components never call `fetch` directly — all server data goes through hooks in `api/`
- All currency values go through `CurrencyDisplay` — never raw number formatting in templates
- Frequency math during the creation playground runs locally via `shared/utils/frequency.ts` for instant feedback
- For saved Blueprint views, the API returns all three computed values — the frontend displays, never recomputes

---

## 6. Blueprint Creation — Playground Flow

Blueprint creation is a client-side-only experience until the user saves. Nothing touches the API during creation.

### How It Works

The route at `routes/blueprint/new.tsx` holds a `BlueprintDraft` in `useState`. Every user action mutates local state. All feedback (three-column math, zero-based balance) is computed instantly from local state using `packages/shared/utils/frequency.ts`.

```
User actions during creation:
  Add category        → append DraftCategory to draft.categories
  Name category       → update DraftCategory.name
  Add expense         → append DraftExpense to DraftCategory.expenses
  Edit expense amount → update DraftExpense.amountAnnual, recompute ZeroBasedTracker
  Delete expense      → remove from DraftCategory.expenses
  Delete category     → remove DraftCategory AND all its DraftExpenses
  Change frequency    → update draft.frequency, ZeroBasedTracker recalculates
  Change income       → update draft.incomeAmount, ZeroBasedTracker recalculates

None of these hit the network.
```

### Save

When the user saves, one `POST /blueprints` call sends the complete draft. The API creates all rows atomically in a single DB transaction.

```typescript
// POST /blueprints request body
{
  name: string
  frequency: FrequencyType
  incomeAmount: string
  categories: Array<{
    name: string
    sortOrder: number
    expenses: Array<{
      name: string
      amountAnnual: string
      sortOrder: number
    }>
  }>
}
```

### Cancel

Navigating away discards the draft. If the draft is non-empty, TanStack Router's `onBeforeLoad` guard shows a confirmation dialog.

### Save Button Gating

The Save button is disabled until all three conditions are met:
1. Blueprint has a name
2. Frequency is selected and income amount is entered
3. `remaining === 0.00`

### Category Deletion During Creation

Deleting a category removes the `DraftCategory` and all nested `DraftExpense` objects from local state in one operation. No confirmation needed during the playground — the user is in an exploratory, no-consequence environment.

---

## 7. Backend Architecture

### Directory Structure

```
apps/api/src/
├── index.ts
├── app.ts
│
├── routes/
│   ├── auth.routes.ts
│   ├── blueprint.routes.ts
│   ├── category.routes.ts
│   └── expense.routes.ts
│
├── controllers/
│   ├── blueprint.controller.ts
│   ├── category.controller.ts
│   └── expense.controller.ts
│
├── services/
│   ├── blueprint.service.ts        # Atomic create from full draft payload
│   ├── category.service.ts
│   └── expense.service.ts          # Frequency conversions, zero-sum validation
│
├── db/
│   ├── client.ts
│   ├── schema/
│   │   ├── users.ts
│   │   ├── blueprints.ts
│   │   ├── income.ts
│   │   ├── expense_categories.ts
│   │   └── expenses.ts
│   └── migrations/
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── requestLogger.middleware.ts
│
└── lib/
    └── errors.ts
```

Ledger routes, controllers, services, and schema files are defined in the full spec and will be added post-MVP.

### Layering Rule

> Request → Route → Controller → Service → DB
> Controllers never touch the DB directly. Services never parse HTTP requests.

---

## 8. Database Schema

All monetary values stored as `NUMERIC(12, 2)`. Never `FLOAT`.

```sql
-- users
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
created_at      TIMESTAMPTZ DEFAULT now()

-- blueprints
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
name            TEXT NOT NULL
frequency       TEXT NOT NULL       -- 'weekly' | 'biweekly'
created_at      TIMESTAMPTZ DEFAULT now()

-- income (one per blueprint)
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id    UUID REFERENCES blueprints(id) ON DELETE CASCADE UNIQUE
amount          NUMERIC(12,2) NOT NULL
created_at      TIMESTAMPTZ DEFAULT now()

-- expense_categories
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id    UUID REFERENCES blueprints(id) ON DELETE CASCADE
name            TEXT NOT NULL
sort_order      INTEGER NOT NULL
created_at      TIMESTAMPTZ DEFAULT now()

-- expenses
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id    UUID REFERENCES blueprints(id) ON DELETE CASCADE
category_id     UUID REFERENCES expense_categories(id) ON DELETE CASCADE
name            TEXT NOT NULL
amount_annual   NUMERIC(12,2) NOT NULL
sort_order      INTEGER NOT NULL
created_at      TIMESTAMPTZ DEFAULT now()
```

**Deferred schema** (defined in full spec, added post-MVP): `ledger`, `accounts`, `buckets`, `transactions`. The `income` table also drops `target_amount` for MVP since variable frequency is deferred.

### Indexes

```sql
CREATE INDEX ON blueprints (user_id);
CREATE INDEX ON expense_categories (blueprint_id);
CREATE INDEX ON expenses (blueprint_id);
CREATE INDEX ON expenses (category_id);
```

### Schema Design Decisions

- `expense_categories.name` is free text — no predefined list, no enum
- `ON DELETE CASCADE` on `category_id` in expenses — deleting a category deletes all its expenses at the DB level
- `amount_annual` is the single stored value — per-paycheck and monthly amounts are always computed at read time

---

## 9. API Reference

All routes prefixed `/api/v1`. All responses `Content-Type: application/json`.

### Auth

```
POST   /auth/register
POST   /auth/login             Returns access token + sets refresh token HttpOnly cookie
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

### Blueprints

```
GET    /blueprints             All blueprints for authenticated user
POST   /blueprints             Create blueprint atomically from full draft payload
GET    /blueprints/:id         Blueprint with income + categories + expenses (computed columns included)
PATCH  /blueprints/:id         Update name or frequency
DELETE /blueprints/:id
```

`GET /blueprints/:id` returns expenses grouped under categories, with computed `amount_per_paycheck` and `amount_monthly` alongside stored `amount_annual`.

**Example response shape:**
```json
{
  "id": "...",
  "name": "Salary Blueprint",
  "frequency": "biweekly",
  "income": { "amount": "3200.00" },
  "remaining": "0.00",
  "categories": [
    {
      "id": "...",
      "name": "Housing",
      "sort_order": 1,
      "total_annual": "19200.00",
      "total_per_paycheck": "800.00",
      "expenses": [
        {
          "id": "...",
          "name": "Rent",
          "amount_annual": "18000.00",
          "amount_per_paycheck": "750.00",
          "amount_monthly": "1500.00",
          "sort_order": 1
        }
      ]
    }
  ]
}
```

### Categories

```
POST   /blueprints/:id/categories              Body: { name, sort_order }
PATCH  /blueprints/:id/categories/:cid         Rename or update sort_order
DELETE /blueprints/:id/categories/:cid         Cascades — deletes all expenses under it
PATCH  /blueprints/:id/categories/reorder      Body: [{ id, sort_order }]
```

### Expenses

```
POST   /blueprints/:id/expenses                Body: { category_id, name, amount_annual, sort_order }
PATCH  /blueprints/:id/expenses/:eid
DELETE /blueprints/:id/expenses/:eid
PATCH  /blueprints/:id/expenses/reorder        Body: [{ id, sort_order }]
```

Ledger, Account, Bucket, and Transaction endpoints are defined in the full spec and will be added post-MVP.

---

## 10. Key Data Flows

### Creating a Blueprint

```
1. User navigates to /blueprint/new
   → BlueprintDraft initialized to emptyDraft() in useState

2. User builds the budget freely (no API calls):
   → Sets income amount + frequency (weekly or biweekly)
   → Adds categories and expenses
   → ZeroBasedTracker recalculates from local state on every change
   → Three-column math runs via shared/utils/frequency.ts

3. When remaining === $0.00 and name + frequency set → Save activates

4. User hits Save
   → POST /blueprints
   → API: single DB transaction
       INSERT blueprint
       INSERT income
       INSERT expense_categories (all)
       INSERT expenses (all)
   → TanStack Query invalidates ['blueprints']
   → Router navigates to /blueprint/$newId

5. Cancel → navigate away, draft discarded
   → If draft non-empty, onBeforeLoad shows confirmation dialog
```

### Deleting a Category (on a Saved Blueprint)

```
1. User deletes a category
2. DELETE /blueprints/:id/categories/:cid
3. Postgres CASCADE deletes all expenses under that category
4. TanStack Query invalidates ['blueprints', id]
5. Blueprint re-renders without the category
6. ZeroBasedTracker updates — remaining is no longer zero
```

---

## 11. Security

- **JWT access tokens**: 15-minute expiry
- **Refresh tokens**: 7-day expiry, `HttpOnly` cookie, rotated on use
- **Postgres user**: restricted to `SELECT`, `INSERT`, `UPDATE`, `DELETE` — no DDL
- **Request logging**: logs route, user ID, status, duration only — never request/response bodies
- **Rate limiting**:
  - `POST /auth/login` → 5 req/min per IP
  - `POST /auth/register` → 3 req/min per IP
  - All other `/api/*` → 60 req/min per authenticated user

---

## 12. Financial Calculation Rules

Enforced in the service layer. All rules covered by unit tests.

### Frequency Conversions (from `amount_annual`)

| Frequency | Per-paycheck formula | Planned periods/year | Real paychecks/year | Bonus paychecks |
|---|---|---|---|---|
| Weekly | `amount_annual / 48` | 48 | 52 | 4 |
| Bi-weekly | `amount_annual / 24` | 24 | 26 | 2 |

**Why ÷ 24 and ÷ 48, not ÷ 26 and ÷ 52:**
The Blueprint is built around clean monthly reconciliation. Using ÷ 24 means 2 bi-weekly paychecks always equal the monthly column exactly. Using ÷ 26 would mean 2 paychecks come up short of the monthly amount, leaving users underfunded for monthly bills.

The trade-off is intentional: bi-weekly earners have 26 real paychecks per year, not 24. The 2 unplanned paychecks are surfaced in the Ledger as **bonus paychecks** — windfalls the user allocates intentionally rather than letting them disappear unnoticed. This is a feature, not a gap.

**Rounding behavior:**
Per-paycheck amounts are rounded to the nearest cent. For most expenses this produces a small surplus (e.g. a $12.99/month subscription becomes $6.50 bi-weekly, accumulating $0.02/month). These micro-surpluses accumulate as positive bucket balances in the Ledger and can be redistributed at any time.

These same formulas exist in `shared/utils/frequency.ts` for use during the creation playground. The API service layer imports the same package — one implementation, no drift between client and server math.

### Zero-Based Validation

`GET /blueprints/:id` returns a `remaining` field:

```
remaining = income.amount - SUM(expenses.amount_annual / paychecks_per_year)
```

Blueprint is complete when `remaining === 0.00`. During creation, computed locally from draft state. After saving, computed server-side on every fetch.

---

## 13. Non-Negotiable Standards (Even for MVP)

These are not deferred. They apply from the first line of code.

| Concern | Implementation |
|---|---|
| Money precision | `NUMERIC(12, 2)` everywhere, never `FLOAT` |
| DB indexes | All FK columns indexed |
| Stateless API | Zero session state in Express process memory |
| Atomic DB transactions | Blueprint creation wrapped in a single transaction |
| Financial math on server | Frequency conversions and zero-sum validation computed server-side on saved data |

---

## 14. What's Deferred and Where to Find It

Everything below is fully specced in the original project specification document. Nothing needs to be re-designed — only built.

| Deferred Item | Notes |
|---|---|
| **The Ledger** | Buckets, accounts, transactions, transfers — full spec in §6–9 of original |
| **Bonus paycheck allocation flow** | Ledger prompt when a paycheck lands outside the 24/48 planned periods |
| **Semi-monthly frequency** | Paycheck estimation, median/low/high, surplus routing |
| **Variable frequency** | Income Reserve, draw mechanics |
| **Docker + Compose** | Multi-service orchestration — full config in original §11 |
| **Nginx** | Reverse proxy + static file serving |
| **PgBouncer** | Connection pooling |
| **CI/CD pipeline** | GitHub Actions → GHCR → DigitalOcean — full pipeline in original §14 |
| **DigitalOcean deployment** | VPS config, SSL, health checks |
