# Budget King — Product Vision

## What It Is

Budget King is a personal finance app built around one simple idea: **you plan before you spend.**

It has two layers:

- **Blueprint** — a zero-based budget planner built around a single paycheck. You define your income, allocate every dollar to a category, and reach exactly $0 remaining before you save.
- **Ledger** — a real-time money manager that tracks actual spending against the Blueprint. Buckets fill on payday, drain as you spend, and surface bonus paychecks as intentional windfalls. *(Post-MVP)*

The Blueprint and the Ledger are intentionally separate concerns. The Blueprint is a plan. The Ledger is reality. You don't mix them.

---

## The Problem It Solves

Most budgeting apps track what already happened. Budget King starts with what's about to happen: your next paycheck. You allocate every dollar before it arrives. When the paycheck lands, the Ledger does the work of keeping you on track — not reminding you that you already went over.

---

## Frequency Philosophy

Budget King supports Weekly and Bi-Weekly pay schedules (Semi-monthly and Variable are post-MVP).

The divisors are intentional:
- **Weekly**: `amount_annual ÷ 48` — not 52
- **Bi-Weekly**: `amount_annual ÷ 24` — not 26

This keeps monthly reconciliation clean. 2 bi-weekly paychecks equal the monthly column exactly. The 2 or 4 "extra" real paychecks per year surface in the Ledger as **bonus paychecks** — money the user allocates intentionally, not money that silently disappears.

---

## MVP Scope

The MVP delivers the Blueprint end-to-end: creation, viewing, and editing.

The Ledger is fully designed and deferred. Nothing in the MVP should require undoing to add the Ledger later.
