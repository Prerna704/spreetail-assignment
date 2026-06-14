# Decision Log

## 1. Use PostgreSQL as the System of Record

Options considered:

- Store balances directly in a table.
- Recalculate balances from expenses and settlements.

Decision: recalculate from ledger-style expense and settlement records.

Why: stored balances drift when rows are edited, deleted, imported twice, or settled. A ledger calculation lets Rohan trace every number back to exact expenses.

## 2. Store Original and Base Currency Amounts

Options considered:

- Convert every amount at display time.
- Store only the original amount.
- Store original amount plus base amount and exchange rate.

Decision: store original amount, original currency, exchange rate, and converted base amount.

Why: Priya's USD concern requires historical conversion. If rates change later, old balances must stay explainable.

## 3. Time-Bound Membership

Options considered:

- Remove members from groups when they leave.
- Keep members forever and add an active flag.
- Store join and leave dates.

Decision: store join date and optional leave date in `group_members`.

Why: Sam should not owe March electricity, while Meera still needs historical March expenses preserved.

## 4. Conservative Import Policy

Options considered:

- Import everything and let users fix later.
- Reject the entire CSV if one row is bad.
- Import clean rows and skip unsafe rows with a report.

Decision: import clean rows, skip blocking anomalies, and create a row-level report.

Why: a crashed import and silent guesses both fail the assignment. The user needs explicit action taken per row.

## 5. Duplicate Cleanup Requires Approval

Options considered:

- Auto-delete duplicate-looking rows.
- Keep duplicates forever.
- Flag duplicates and require approval before deletion.

Decision: duplicate rows are warnings. Cleanup goes through `duplicate_review_requests`.

Why: Meera asked to approve anything the app deletes or changes. Similar dinners with different amounts are not safe to auto-resolve.

## 6. Accept Names and Emails in CSV

Options considered:

- Require exact user email in CSV.
- Allow only flatmate names.
- Match both registered email and user name.

Decision: match both name and email, normalized case-insensitively.

Why: real spreadsheets are inconsistent. The assignment explicitly says the CSV should import without manual modification.

## 7. Exact Split Currency Rule

Options considered:

- Interpret exact split values as group base currency.
- Interpret exact split values as original expense currency.

Decision: exact split values are in the expense currency and then converted.

Why: if the trip row is in USD, exact participant shares should also be understood as USD unless the CSV says otherwise.

## 8. JWT Authentication

Options considered:

- Server sessions.
- JWT stored client-side.

Decision: JWT with an Axios interceptor.

Why: it is simple, deployable on Render/Vercel, and matches the assignment requirement. In a production finance-grade app, HttpOnly cookies would be preferable.

## 9. Soft Deletes and Audit Trail

Options considered:

- Hard delete rows.
- Soft delete rows with audit snapshots.

Decision: soft delete mutable business records and write audit logs.

Why: the live evaluation may ask why an expense changed. Before/after snapshots make edits explainable.
