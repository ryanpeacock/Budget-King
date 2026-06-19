# Budget King — Claude Code Context

Read this file at the start of every session. It is the single source of truth for how this project runs and what the rules are.

---

## How to Run the Project

Three terminals, always in this order:

```bash
# Terminal 1 — Postgres (must be running before the API starts)
docker compose up -d

# Terminal 2 — API
cd apps/api && tsx watch src/index.ts

# Terminal 3 — Web
cd apps/web && vite
```

- Postgres runs in Docker on port 5432 — config lives in `docker-compose.yml` at the repo root
- API runs on port 3000
- Web dev server runs on Vite's default (5173)
- Only Postgres runs in Docker — the API and web app run natively

### Docker Compose setup

`docker-compose.yml` at the repo root:

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: budgetking
      POSTGRES_PASSWORD: budgetking
      POSTGRES_DB: budgetking
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

`DATABASE_URL` in `apps/api/.env`:
```
DATABASE_URL=postgresql://budgetking:budgetking@localhost:5432/budgetking
```

Useful commands:
```bash
docker compose up -d      # start Postgres in background
docker compose down       # stop (data persists in volume)
docker compose down -v    # stop AND wipe all data (clean slate)
```

---

## Project Structure

```
budget-king/
├── apps/
│   ├── web/          # React SPA (Vite + TanStack Router + TanStack Query)
│   └── api/          # Express REST API (Node.js + TypeScript)
├── packages/
│   └── shared/       # Types and frequency math — used by both apps
└── pnpm-workspace.yaml
```

The shared package import alias is `@budget-king/shared`. Never duplicate types or frequency math between the API and the web app — everything lives in shared.

---

## Non-Negotiable Standards

These apply from the first line of code. Do not defer them.

| Concern | Rule |
|---|---|
| Money precision | `NUMERIC(12,2)` in Postgres, always. Never `FLOAT`. |
| Currency display | Always through `CurrencyDisplay` component. Never `.toFixed()` or raw number formatting in templates. |
| Rounding | Always `Math.round(value * 100) / 100`. Never `.toFixed()`. |
| DB indexes | All FK columns must be indexed. |
| Atomic transactions | Blueprint creation (all inserts) must be wrapped in a single Drizzle transaction. |
| Stateless API | Zero session state in Express process memory. |
| Financial math | Frequency conversions and zero-sum validation are computed server-side on saved data. During creation playground only, they run client-side from the same shared package. |
| Request logging | Log route, user ID, status, duration only. Never log request or response bodies. |

---

## State Management — Hard Rules

> TanStack Query owns all server state. TanStack Router owns URL and navigation state. React `useState` handles local UI state. These never overlap.

- No global client-side state manager (no Zustand, no Redux, no Context for data)
- Blueprint creation draft lives entirely in `useState` — nothing touches the API until the user explicitly saves
- Filter and sort preferences live in TanStack Router search params
- Components never call `fetch` directly — all server data goes through hooks in `apps/web/src/api/`

---

## Backend Layering Rule

```
Request → Route → Controller → Service → DB
```

- Controllers never touch the DB directly
- Services never parse HTTP requests
- This pattern is enforced in every phase — do not shortcut it

---

## Frequency Math

The divisors are intentional. Do not change them.

| Frequency | Divisor | Why |
|---|---|---|
| Weekly | ÷ 48 (not 52) | Keeps monthly reconciliation clean |
| Bi-Weekly | ÷ 24 (not 26) | 2 paychecks = monthly column exactly |

The "extra" real paychecks (4 weekly, 2 bi-weekly) surface in the Ledger as bonus paychecks — a feature, not an error. The Ledger is post-MVP.

All frequency math lives in `packages/shared/src/utils/frequency.ts`. The API imports it. The web app imports it. One implementation, no drift.

---

## MVP Scope — What Exists and What Doesn't

**In scope:**
- User auth (register, login, logout, JWT + refresh token)
- Blueprint creation playground (client-side until save)
- Saved Blueprint view (three-column: per-paycheck / monthly / annual)
- Blueprint editing (inline, on save)
- Zero-based tracker
- Weekly and Bi-Weekly pay frequencies

**Explicitly deferred — do not build, stub, or reference:**
- The Ledger (buckets, accounts, transactions, transfers)
- Semi-monthly and variable pay frequencies
- Nginx, PgBouncer
- CI/CD pipeline
- Production infrastructure of any kind

If you find yourself thinking "while I'm here I'll also add..." — stop. Only build what the current task asks for.

---

## Key Files

| File | Purpose |
|---|---|
| `docs/spec.md` | Full technical spec — API contracts, schema, data flows, response shapes |
| `docs/roadmap.md` | Phased task list — work one task at a time, in order |
| `docs/vision.md` | Product context — read if you need to understand *why* something works a certain way |
| `docs/decisions.md` | Architectural decisions and their rationale — check before suggesting alternatives |
| `docs/WORKFLOW.md` | Task implementation process — follow this for every task |
| `postman/budget-king.postman_collection.json` | Postman collection — must stay in sync with all API routes |

---

## Postman Collection

The collection at `postman/budget-king.postman_collection.json` is the canonical manual test client for the API. Import via Postman → File → Import. No separate environment file is needed — all variables are collection-scoped.

**Collection variables:** `baseUrl` (default: `http://localhost:3000/api/v1`), `accessToken` (auto-set by Login request), `blueprintId` / `categoryId` / `expenseId` (auto-set by their respective Create requests).

**Maintenance rule — enforced in every task:** Any task that adds, removes, renames, or changes the shape of a route must update the collection in the same commit. Specifically:
- Added a route → add a request in the correct folder with a correct example body
- Removed a route → delete the request
- Changed a request body field → update the example body
- Changed a response shape → update the request description
- Renamed a path segment → update the URL

---

## Auth Setup

- JWT access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry, HttpOnly cookie, rotated on use
- Auth library: Better Auth, mounted at `/api/v1/auth`
- Rate limits: login 5 req/min per IP, register 3 req/min per IP, all other API routes 60 req/min per authenticated user

---

## Git Commit Rules

After every task is verified, commit the changes. Always:

- Stage specific files by name — never `git add -A` or `git add .`
- Write a concise commit message describing what was built
- Never include "Co-Authored-By", "Generated with Claude", or any AI attribution in commit messages
- Commit directly to main (this is a solo project on main by default)

---

## API Conventions

- All routes prefixed `/api/v1`
- All responses `Content-Type: application/json`
- Error shape: `{ "error": "message" }`
- 401 for unauthenticated, 404 for not found or wrong user, 400 for validation errors
- Blueprint ownership is always verified before any read or write — a user can never access another user's data
