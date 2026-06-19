# Budget King — MVP Implementation Roadmap

Each task is written to be handed to Claude Code as a single, isolated prompt. Complete every task in a phase before moving to the next phase. Do not skip ahead.

---

## Phase 1 — Project Scaffold

Get the monorepo structure, tooling, and shared package in place. No application logic yet. The goal is a working skeleton where all three terminals run without errors.

---

### Task 1.0 — Set up version control

Create the GitHub repository and connect it locally before any code is written.

**Do this manually (not Claude Code):**
1. Create a new GitHub repository named `budget-king` — private or public, your call
2. Initialize git locally in your project folder: `git init`
3. Create a `.gitignore` at the root covering: `node_modules`, `.env`, `dist`, `.DS_Store`, `*.local`
4. Create a minimal `README.md` with the project name and a one-line description
5. Connect to the remote: `git remote add origin <your-repo-url>`
6. Make the first commit: `git add . && git commit -m "init"`
7. Push: `git push -u origin main`

Decide on a branch strategy before writing any code. For solo development, a simple approach works well: do all work on `main` for now, and create feature branches if you want to experiment with something risky.

---

### Task 1.1 — Initialize the monorepo

Set up the pnpm workspace with the correct folder structure and root-level config files.

**Prompt for Claude Code:**
> Initialize a pnpm monorepo called `budget-king` with the following structure: `apps/web`, `apps/api`, `packages/shared`. Create `pnpm-workspace.yaml` at the root that includes all three. Add a root `package.json` with a name of `budget-king` and `"private": true`. Add a root `tsconfig.json` with strict mode enabled. Do not install any dependencies yet.

---

### Task 1.2 — Scaffold the shared package

Create the shared package with its type files and the frequency utility stub.

**Prompt for Claude Code:**
> In `packages/shared`, initialize a `package.json` with name `@budget-king/shared`. Create the following empty TypeScript files: `src/types/blueprint.ts`, `src/types/expense.ts`, `src/utils/frequency.ts`. Add a `tsconfig.json` that extends the root config. Do not add any content to the files yet — just the correct structure and exports in an `src/index.ts` barrel file.

---

### Task 1.3 — Add shared types

Populate the shared type files with the Blueprint draft types from the spec.

**Prompt for Claude Code:**
> In `packages/shared/src/types/blueprint.ts`, add the following types exactly as specified: `FrequencyType` (`'weekly' | 'biweekly'`), `DraftExpense`, `DraftCategory`, `BlueprintDraft`, and the `emptyDraft()` factory function. In `packages/shared/src/types/expense.ts`, add a `ComputedExpense` type with fields: `id`, `name`, `amount_annual`, `amount_per_paycheck`, `amount_monthly`, `sort_order` — all strings except `sort_order` which is a number. Export everything from `src/index.ts`.

---

### Task 1.4 — Add the frequency utility

Implement the frequency math in the shared utils file.

**Prompt for Claude Code:**
> In `packages/shared/src/utils/frequency.ts`, implement and export the following functions:
> - `toPerPaycheck(amountAnnual: number, frequency: FrequencyType): number` — divides by 48 for weekly, 24 for biweekly, rounds to 2 decimal places
> - `toMonthly(amountAnnual: number): number` — divides by 12, rounds to 2 decimal places
> - `toAnnualFromMonthly(monthly: number): number` — multiplies by 12
> - `toAnnualFromPerPaycheck(perPaycheck: number, frequency: FrequencyType): number` — multiplies by 48 for weekly, 24 for biweekly
> - `paychecksPerYear(frequency: FrequencyType): number` — returns 48 or 24
>
> Import `FrequencyType` from `../types/blueprint`. All rounding must use `Math.round(value * 100) / 100` — never `toFixed`.

---

### Task 1.5 — Scaffold the API

Initialize the Express API app with TypeScript and a working health check route.

**Prompt for Claude Code:**
> In `apps/api`, initialize a `package.json` with name `@budget-king/api`. Install `express`, `typescript`, `tsx`, `@types/express`, `@types/node`. Create `src/index.ts` that starts an Express server on port 3000. Create `src/app.ts` that exports the Express app with a single route: `GET /api/v1/health` returning `{ "status": "ok" }`. Add a `tsconfig.json` extending the root config. Add a `dev` script using `tsx watch src/index.ts`.

---

### Task 1.6 — Scaffold the web app

Initialize the React + Vite frontend with TanStack Router and TanStack Query installed but not yet configured.

**Prompt for Claude Code:**
> In `apps/web`, scaffold a React + Vite app using TypeScript. Install `@tanstack/react-router`, `@tanstack/react-query`. Remove the Vite boilerplate (default App.tsx content, CSS files, assets). Create a minimal `src/main.tsx` that renders a `<div>` with the text "Budget King" to confirm the app boots. Add a `tsconfig.json` extending the root config.

---

### Task 1.7 — Confirm the monorepo builds

Verify all three packages compile without errors before moving on.

**Prompt for Claude Code:**
> Add a root-level `build` script to `package.json` that runs `tsc --noEmit` in `packages/shared`, `apps/api`, and `apps/web` in sequence using `pnpm --filter`. Run it and fix any TypeScript errors until all three pass cleanly.

---

## Phase 2 — Database and Auth

Get Postgres connected, the schema migrated, and auth working end-to-end. Nothing else. The goal of this phase is: a user can register, log in, and receive a JWT.

---

### Task 2.1 — Connect Drizzle to Postgres

Set up the Drizzle ORM client and confirm it can connect to the Dockerized Postgres database.

**Prompt for Claude Code:**
> In `apps/api`, install `drizzle-orm`, `drizzle-kit`, and `pg`. Create `src/db/client.ts` that initializes a Drizzle client using a `DATABASE_URL` environment variable. Create `apps/api/.env` with `DATABASE_URL=postgresql://budgetking:budgetking@localhost:5432/budgetking` — this matches the Docker Compose config at the repo root. Add a `src/lib/env.ts` file that reads and validates environment variables using plain TypeScript (no zod yet). Confirm the client exports correctly — no migration yet.

---

### Task 2.2 — Write the database schema

Add all MVP schema files to Drizzle.

**Prompt for Claude Code:**
> In `apps/api/src/db/schema/`, create the following Drizzle schema files using the `pg` dialect and `NUMERIC(12,2)` for all money fields:
> - `users.ts` — id (uuid, primary key), email (text, unique, not null), password_hash (text, not null), created_at (timestamptz, default now)
> - `blueprints.ts` — id, user_id (FK → users, cascade delete), name (text), frequency (text: 'weekly' | 'biweekly'), created_at
> - `income.ts` — id, blueprint_id (FK → blueprints, cascade delete, unique), amount (numeric 12,2), created_at
> - `expense_categories.ts` — id, blueprint_id (FK → blueprints, cascade delete), name (text), sort_order (integer), created_at
> - `expenses.ts` — id, blueprint_id (FK → blueprints, cascade delete), category_id (FK → expense_categories, cascade delete), name (text), amount_annual (numeric 12,2), sort_order (integer), created_at
>
> Create a `src/db/schema/index.ts` that exports all schemas. Add all required indexes from the spec.

---

### Task 2.3 — Run the first migration

Generate and run the Drizzle migration to create all tables.

**Prompt for Claude Code:**
> Configure `drizzle.config.ts` at the `apps/api` root pointing at `src/db/schema/index.ts`. Add a `db:generate` script to run `drizzle-kit generate` and a `db:migrate` script to run `drizzle-kit migrate`. Run both scripts. Confirm all five tables exist in the local Postgres database.

---

### Task 2.4 — Install and configure Better Auth

Set up Better Auth on the API with register, login, logout, and refresh routes.

**Prompt for Claude Code:**
> In `apps/api`, install `better-auth`. Configure it in `src/lib/auth.ts` using the Drizzle adapter connected to the existing db client. Set up JWT access tokens (15 minute expiry) and refresh tokens (7 day expiry, HttpOnly cookie). Mount the Better Auth router at `/api/v1/auth` in `src/app.ts`. The following routes must work: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`.

---

### Task 2.5 — Add the auth middleware

Create the middleware that protects API routes.

**Prompt for Claude Code:**
> In `apps/api/src/middleware/auth.middleware.ts`, create an Express middleware function that validates the JWT access token from the Authorization header. On success, attach the decoded `userId` to `req.user`. On failure, return a 401 JSON response `{ "error": "Unauthorized" }`. Export the middleware. Do not apply it to any routes yet.

---

### Task 2.6 — Add rate limiting

Add rate limiting to the auth routes.

**Prompt for Claude Code:**
> Install `express-rate-limit` in `apps/api`. Create `src/middleware/rateLimit.middleware.ts` and export two limiters: `authLoginLimiter` (5 requests/min per IP) and `authRegisterLimiter` (3 requests/min per IP). Apply `authLoginLimiter` to `POST /auth/login` and `authRegisterLimiter` to `POST /auth/register` in the auth router.

---

### Task 2.7 — Add request logging

Add the request logger middleware.

**Prompt for Claude Code:**
> In `apps/api/src/middleware/requestLogger.middleware.ts`, create an Express middleware that logs: HTTP method, route path, authenticated user ID (if present on `req.user`), response status code, and request duration in milliseconds. It must never log request or response bodies. Apply it globally in `src/app.ts` before all routes.

---

### Task 2.8 — Manual auth test

Verify the auth flow works end-to-end before building anything else.

**Prompt for Claude Code:**
> Using curl or a REST client, write a test script at `apps/api/test-auth.sh` that: registers a new user, logs in and captures the access token, calls `GET /auth/me` with the token, and logs out. Each step should print the response. Run it and confirm all four steps return expected responses.

---

## Phase 3 — Blueprint API

Build the complete Blueprint backend. No frontend yet. The goal is: every Blueprint API endpoint works correctly and can be tested manually.

---

### Task 3.1 — Blueprint service: create

Build the atomic blueprint creation service function.

**Prompt for Claude Code:**
> In `apps/api/src/services/blueprint.service.ts`, implement `createBlueprint(userId, draft)` where draft matches the `POST /blueprints` request body from the spec. The function must wrap all inserts in a single Drizzle transaction: INSERT blueprint, INSERT income, INSERT all categories, INSERT all expenses. Return the created blueprint id. Import frequency types from `@budget-king/shared`.

---

### Task 3.2 — Blueprint service: fetch

Build the service function that fetches a saved blueprint with all computed columns.

**Prompt for Claude Code:**
> In `apps/api/src/services/blueprint.service.ts`, implement `getBlueprintById(blueprintId, userId)`. It must return the full blueprint with income, categories, and expenses. For each expense, compute `amount_per_paycheck` and `amount_monthly` using `toPerPaycheck` and `toMonthly` from `@budget-king/shared`. Compute category subtotals (`total_annual`, `total_per_paycheck`). Compute the top-level `remaining` field. Return null if not found or if the blueprint belongs to a different user.

---

### Task 3.3 — Blueprint service: list, update, delete

Build the remaining blueprint service functions.

**Prompt for Claude Code:**
> In `apps/api/src/services/blueprint.service.ts`, implement:
> - `listBlueprints(userId)` — returns all blueprints for the user, newest first, without expenses
> - `updateBlueprint(blueprintId, userId, fields)` — updates name and/or frequency, returns updated blueprint
> - `deleteBlueprint(blueprintId, userId)` — deletes blueprint and all children via cascade, returns void
>
> All functions must verify the blueprint belongs to the requesting user before modifying.

---

### Task 3.4 — Category and expense services

Build the category and expense service functions.

**Prompt for Claude Code:**
> Create `apps/api/src/services/category.service.ts` with: `createCategory`, `updateCategory` (rename or sort_order), `deleteCategory`, `reorderCategories` (batch sort_order update in a transaction).
>
> Create `apps/api/src/services/expense.service.ts` with: `createExpense`, `updateExpense`, `deleteExpense`, `reorderExpenses` (batch).
>
> All functions must accept and verify `blueprintId` and `userId` before operating. Expense functions also accept `categoryId`.

---

### Task 3.5 — Blueprint controller and routes

Wire the services into controllers and mount the routes.

**Prompt for Claude Code:**
> Create `apps/api/src/controllers/blueprint.controller.ts` with handler functions for each blueprint service call. Create `apps/api/src/controllers/category.controller.ts` and `apps/api/src/controllers/expense.controller.ts` similarly.
>
> Create route files: `src/routes/blueprint.routes.ts`, `src/routes/category.routes.ts`, `src/routes/expense.routes.ts`. Mount all routes under `/api/v1` in `src/app.ts`. Apply the `auth.middleware` to all blueprint, category, and expense routes.
>
> Controllers must never access the database directly — only call service functions.

---

### Task 3.6 — Blueprint API error handling

Add consistent error handling across all Blueprint routes.

**Prompt for Claude Code:**
> In `apps/api/src/lib/errors.ts`, create typed error classes: `NotFoundError`, `UnauthorizedError`, `ValidationError`. Add a global Express error handler in `src/app.ts` that catches these and returns appropriate JSON responses with correct status codes (404, 401, 400). Apply it as the last middleware. Update service functions to throw these errors instead of returning null.

---

### Task 3.7 — Manual Blueprint API test

Verify all Blueprint endpoints work before building the frontend.

**Prompt for Claude Code:**
> Write `apps/api/test-blueprints.sh` that: logs in as a test user, creates a blueprint with two categories and three expenses, fetches it by id and confirms computed columns are correct, updates the blueprint name, deletes one expense, deletes one category and confirms its expenses are gone, then deletes the blueprint. Print each response. Run it and confirm all steps pass.

---

## Phase 4 — Frontend Foundation

Set up the React app's routing, auth flow, and base layout. No Blueprint UI yet. The goal is: a user can log in and see a blank authenticated dashboard.

---

### Task 4.1 — Configure TanStack Router

Set up file-based routing with the root layout and an auth guard.

**Prompt for Claude Code:**
> In `apps/web/src`, configure TanStack Router with the following routes: `__root.tsx` (root layout with auth guard — redirects to `/login` if not authenticated), `login.tsx` (placeholder login page), `dashboard.tsx` (placeholder dashboard, auth-protected). The auth guard should check for a valid session — use a simple boolean in `src/lib/auth.ts` for now, we will wire it to the real API in the next task.

---

### Task 4.2 — Configure TanStack Query and auth client

Set up the Query client and wire the auth state to the real API.

**Prompt for Claude Code:**
> In `apps/web/src/lib/queryClient.ts`, initialize and export a TanStack Query client. In `src/lib/auth.ts`, implement `getSession()` using fetch to call `GET /api/v1/auth/me` — return the user object or null. Update the root layout auth guard to use `getSession()` via a TanStack Query `useQuery` hook. The app should redirect unauthenticated users to `/login` and authenticated users away from `/login` to `/dashboard`.

---

### Task 4.3 — Login page

Build the login form and wire it to the auth API.

**Prompt for Claude Code:**
> In `apps/web/src/routes/login.tsx`, build a login form with email and password fields and a submit button. On submit, POST to `/api/v1/auth/login`. On success, invalidate the session query and navigate to `/dashboard`. On failure, display the error message. Use only `useState` for form state — no external form library. Use the `Button`, `Input` UI components (create them as minimal unstyled components if they don't exist yet).

---

### Task 4.4 — Base UI components

Build the four base UI components used throughout the app.

**Prompt for Claude Code:**
> In `apps/web/src/components/ui/`, create four minimal functional components:
> - `Button.tsx` — accepts `children`, `onClick`, `disabled`, `variant` ('primary' | 'secondary' | 'ghost')
> - `Input.tsx` — accepts `value`, `onChange`, `placeholder`, `type`, `disabled`
> - `Modal.tsx` — accepts `isOpen`, `onClose`, `children` — renders a centered overlay
> - `CurrencyDisplay.tsx` — accepts `value: string | number` — always renders as USD with 2 decimal places using `Intl.NumberFormat`. Never use `.toFixed()`.
>
> No styling required yet — just correct props and behavior.

---

### Task 4.5 — Dashboard shell

Build the dashboard as a simple list of blueprints fetched from the API.

**Prompt for Claude Code:**
> In `apps/web/src/api/blueprints.ts`, create a `useBlueprints()` TanStack Query hook that fetches `GET /api/v1/blueprints`. In `apps/web/src/routes/dashboard.tsx`, use this hook to render a list of blueprint names. Show a loading state while fetching, an empty state with a "Create your first Blueprint" prompt if the list is empty, and a "New Blueprint" button that navigates to `/blueprint/new`. The list items should link to `/blueprint/$blueprintId`.

---

## Phase 5 — Blueprint Creation Playground

Build the client-side creation flow. This is the core of the MVP. The goal is: a user can build a complete zero-based budget entirely in the browser, reach $0 remaining, and save it.

---

### Task 5.1 — Blueprint draft state and actions

Build the state management for the creation playground.

**Prompt for Claude Code:**
> In `apps/web/src/routes/blueprint/new.tsx`, initialize a `BlueprintDraft` in `useState` using `emptyDraft()` from `@budget-king/shared`. Implement the following state mutation functions (no UI yet — just the functions and a debug JSON display of the current draft state):
> - `setName(name: string)`
> - `setFrequency(frequency: FrequencyType)`
> - `setIncomeAmount(amount: string)`
> - `addCategory()`
> - `updateCategoryName(categoryId: string, name: string)`
> - `deleteCategory(categoryId: string)` — removes category and all its expenses
> - `addExpense(categoryId: string)`
> - `updateExpenseName(expenseId: string, name: string)`
> - `updateExpenseAmount(expenseId: string, amountAnnual: string)`
> - `deleteExpense(expenseId: string)`

---

### Task 5.2 — Frequency math and ZeroBasedTracker

Wire the frequency math into the draft state and build the tracker component.

**Prompt for Claude Code:**
> In `apps/web/src/components/blueprint/ZeroBasedTracker.tsx`, build a component that accepts `incomeAmount: string`, `categories: DraftCategory[]`, and `frequency: FrequencyType | null`. It should:
> - Compute total expenses per paycheck by summing `toPerPaycheck(parseFloat(expense.amountAnnual), frequency)` across all expenses using `@budget-king/shared`
> - Compute `remaining = parseFloat(incomeAmount) - totalExpenses`
> - Display income, total allocated, and remaining
> - Show remaining in green when it equals 0.00, red when negative, neutral otherwise
>
> Add it to `new.tsx` and confirm it reacts to draft state changes.

---

### Task 5.3 — ExpenseRow component

Build the three-column expense row with live math.

**Prompt for Claude Code:**
> In `apps/web/src/components/blueprint/ExpenseRow.tsx`, build a component that accepts a `DraftExpense`, `frequency: FrequencyType | null`, and callbacks `onNameChange`, `onAmountChange`, `onDelete`.
>
> It must display three columns: per-paycheck, monthly, and annual. The user types into any one column — the other two update instantly using `toPerPaycheck`, `toMonthly`, and `toAnnualFromMonthly` / `toAnnualFromPerPaycheck` from `@budget-king/shared`. Store only `amountAnnual` in the draft — derive the other two for display only. Use `CurrencyDisplay` for all rendered values.

---

### Task 5.4 — CategorySection component

Build the category section that wraps expense rows.

**Prompt for Claude Code:**
> In `apps/web/src/components/blueprint/CategorySection.tsx`, build a component that accepts a `DraftCategory`, `frequency: FrequencyType | null`, and callbacks for all category and expense mutations from Task 5.1. It should render:
> - An editable category name input
> - A list of `ExpenseRow` components for each expense
> - An "Add expense" button that calls `addExpense`
> - A delete button for the category that calls `deleteCategory`
> - A category subtotal row showing the sum of all expenses in the three columns

---

### Task 5.5 — Blueprint name and frequency selector

Build the income and frequency inputs at the top of the creation form.

**Prompt for Claude Code:**
> In `apps/web/src/components/blueprint/BlueprintEditor.tsx`, build the top section of the editor with:
> - A text input for the Blueprint name bound to `draft.name`
> - A frequency selector with two options: "Weekly" and "Bi-Weekly" bound to `draft.frequency`
> - A currency input for the paycheck amount bound to `draft.incomeAmount`
> - A `FrequencyBadge` component (`src/components/blueprint/FrequencyBadge.tsx`) that displays the selected frequency as a small label
>
> Below these inputs, render the list of `CategorySection` components and an "Add category" button.

---

### Task 5.6 — Save and cancel flow

Wire up the save button and the unsaved changes guard.

**Prompt for Claude Code:**
> In `apps/web/src/api/blueprints.ts`, add a `useCreateBlueprint()` TanStack Query mutation that posts to `POST /api/v1/blueprints`.
>
> In `new.tsx`:
> - Add a Save button that is disabled unless: name is set, frequency is set, incomeAmount is set, and `remaining === 0.00`
> - On save, call `useCreateBlueprint()` with the draft payload, then navigate to `/blueprint/$newId`
> - Add a TanStack Router `onBeforeLoad` guard that shows a confirmation dialog if the draft is non-empty and the user tries to navigate away

---

## Phase 6 — Saved Blueprint View and Editing

Display a saved Blueprint and allow inline editing. The goal is: a user can view a saved Blueprint with all three columns populated and edit any part of it.

---

### Task 6.1 — Blueprint detail query hook

Build the TanStack Query hook for fetching a single Blueprint.

**Prompt for Claude Code:**
> In `apps/web/src/api/blueprints.ts`, add a `useBlueprintById(id: string)` hook that fetches `GET /api/v1/blueprints/:id`. The response includes computed `amount_per_paycheck` and `amount_monthly` for each expense. Create a TypeScript type `SavedBlueprint` in `packages/shared/src/types/blueprint.ts` that matches the full API response shape from the spec.

---

### Task 6.2 — Saved Blueprint view

Build the read view for a saved Blueprint.

**Prompt for Claude Code:**
> In `apps/web/src/routes/blueprint/$blueprintId.tsx`, use `useBlueprintById` to fetch and display the Blueprint. Show the name, frequency badge, income amount, and all categories with their expenses in a three-column layout. Use `CurrencyDisplay` for all money values — never recompute the amounts, just display what the API returns. Show the `ZeroBasedTracker` using the API's `remaining` field. Show a loading skeleton while fetching.

---

### Task 6.3 — Inline editing on saved Blueprint

Add editing capabilities to the saved Blueprint view.

**Prompt for Claude Code:**
> In `apps/web/src/api/blueprints.ts`, add mutation hooks for: `useUpdateBlueprint`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`. Each must invalidate `['blueprints', id]` on success.
>
> In `$blueprintId.tsx`, wire up inline editing: clicking the blueprint name makes it editable, clicking a category name makes it editable, expense amounts are editable in any column (convert to annual before sending to API). Each edit saves immediately on blur. Category and expense delete buttons call their respective mutations.

---

### Task 6.4 — Blueprint delete

Add the ability to delete a Blueprint from the dashboard.

**Prompt for Claude Code:**
> In `apps/web/src/api/blueprints.ts`, add a `useDeleteBlueprint()` mutation that calls `DELETE /api/v1/blueprints/:id` and invalidates `['blueprints']` on success. In `dashboard.tsx`, add a delete button next to each Blueprint list item. Clicking it should show a confirmation Modal before deleting. After deletion, the list should update automatically via TanStack Query cache invalidation.

---

## Phase 7 — Polish and Hardening

The app works end-to-end. This phase closes loose ends before the MVP is considered done.

---

### Task 7.1 — Unit tests for frequency math

Write tests for the shared frequency utility.

**Prompt for Claude Code:**
> Install `vitest` in `packages/shared`. Write unit tests in `src/utils/frequency.test.ts` covering:
> - `toPerPaycheck` for both frequencies with clean amounts (e.g. $1,500/month → $750 bi-weekly)
> - `toPerPaycheck` with amounts that produce rounding (e.g. $12.99/month → $6.50 bi-weekly)
> - `toMonthly` for a known annual amount
> - Round-trip: annual → per-paycheck → back to annual should equal original (within rounding tolerance)
> - That weekly uses ÷ 48 and bi-weekly uses ÷ 24 — not ÷ 52 and ÷ 26

---

### Task 7.2 — Unit tests for zero-based validation

Write tests for the server-side zero-based calculation.

**Prompt for Claude Code:**
> Install `vitest` in `apps/api`. Write unit tests for the `remaining` calculation in `blueprint.service.ts` covering: a blueprint that sums to exactly zero, one that has remaining balance, one that is over-allocated (negative remaining), and one with rounding across multiple expenses.

---

### Task 7.3 — Error states and empty states

Audit the frontend for missing error and empty states.

**Prompt for Claude Code:**
> Review all routes and add missing states:
> - `dashboard.tsx` — error state if blueprint list fetch fails
> - `$blueprintId.tsx` — 404 state if blueprint not found, error state if fetch fails
> - All mutation errors — display an inline error message near the relevant field or action when a mutation fails
> - Login form — already has error handling from Task 4.3, confirm it handles network errors too

---

### Task 7.4 — Auth token refresh

Wire up automatic token refresh so the user is never unexpectedly logged out.

**Prompt for Claude Code:**
> In `apps/web/src/lib/auth.ts`, add an HTTP interceptor (or a fetch wrapper) that: on any 401 response, attempts `POST /api/v1/auth/refresh`, then retries the original request once with the new token. If the refresh also fails, clear the session and redirect to `/login`. Apply this wrapper to all authenticated API calls in `src/api/blueprints.ts`.

---

### Task 7.5 — Final smoke test

Do a full end-to-end walkthrough and fix anything broken.

**Prompt for Claude Code:**
> Walk through the following user journey and fix any bugs encountered:
> 1. Register a new user
> 2. Log in
> 3. Create a bi-weekly Blueprint with 3 categories and 6 expenses, reach exactly $0 remaining, save it
> 4. View the saved Blueprint — confirm all three columns are correct
> 5. Edit an expense amount — confirm the Blueprint no longer shows $0 remaining
> 6. Add a new expense to bring it back to $0
> 7. Delete a category — confirm its expenses are gone and remaining updates
> 8. Delete the Blueprint from the dashboard
> 9. Log out

---

## Phase Order Summary

| Phase | What you have when it's done |
|---|---|
| 1 — Scaffold | Monorepo boots, shared types and frequency math exist |
| 2 — Database + Auth | Users can register and log in, all tables exist |
| 3 — Blueprint API | All Blueprint endpoints work and are tested |
| 4 — Frontend Foundation | Auth flow works, blank dashboard renders |
| 5 — Creation Playground | Users can build and save a Blueprint |
| 6 — Saved View + Editing | Users can view and edit a saved Blueprint |
| 7 — Polish | Tests pass, error states handled, auth refresh works |
