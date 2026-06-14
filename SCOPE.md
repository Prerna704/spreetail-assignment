# Scope

## Product Scope

This app is built for the flatmates described in the assignment: Aisha, Rohan, Priya, Meera, Sam, and Dev. It supports login, time-bound group membership, expense management, historical INR/USD conversion, CSV import, anomaly reporting, approval-based duplicate cleanup, balance summaries, simplified settlement suggestions, and traceability behind every balance.

## In Scope

- Email/password login with JWT.
- Protected frontend routes and protected Express API routes.
- Group create, edit, delete, and member management.
- Member join date and leave date.
- Expense create, edit, delete with category, payer, participants, and split type.
- Equal, percentage, and exact amount split handling.
- INR and USD with historical exchange rates.
- Settlement recording.
- Group-wise balance summary and individual net balance.
- Simplified debt settlement suggestions.
- CSV upload/import without manual CSV modification.
- Row-level anomaly detection and import report generation.
- Audit trail for create, update, delete, import, and duplicate approval actions.
- Duplicate removal workflow that requires user approval.
- Expense traceability in balance responses.

## Out of Scope

- Real payment gateway transfers.
- OAuth or social login.
- Real-time collaboration.
- Automatic exchange-rate fetching from a third-party API.
- Native mobile apps.
- Fine-grained role permissions beyond group membership checks.

## Assignment Demo Data

`backend/src/db/seed.sql` creates:

- Aisha, Rohan, Priya, Meera, Sam, and Dev.
- Demo password for each seeded user: `password123`.
- Group: `Flatmates Feb-Apr`.
- Meera membership: `2026-02-01` to `2026-03-31`.
- Sam membership: starts `2026-04-15`.
- Dev trip membership: `2026-04-10` to `2026-04-20`.
- INR/USD exchange rates from `2026-02-01`.

## CSV Anomaly Policy

The import module is deliberately conservative. A row is either imported, skipped, or imported with review required.

| Anomaly | Detection | Action |
| --- | --- | --- |
| Duplicate expenses | Same group, payer, date, and description already exists; amount may match or differ | Import row but mark `REVIEW_REQUIRED`; duplicate deletion requires approval |
| Invalid dates | Date cannot be parsed as ISO, slash date, or valid JS date | Skip row |
| Negative amounts | Amount is missing, zero, negative, or non-numeric | Skip row |
| Missing members | Payer or participant cannot be matched by registered email or name | Skip row |
| Invalid currency | Currency is not INR/USD and cannot be inferred from `₹` or `$` | Skip row |
| Settlement as expense | Row type or description looks like settlement, paid back, reimbursement, or repaid | Skip row |
| Member inactive | Expense date is before join date or after leave date | Skip row |
| Invalid percentage total | Percentage split does not total 100 | Skip row |
| Invalid exact total | Exact split total does not match amount | Skip row |
| Blank required fields | Missing date, description, amount, currency, or payer | Skip row |

## CSV Handling Details

- The importer accepts common aliases: `paid_by`, `payer`, `paid_by_email`, `who_paid`, `split_between`, `split_with`, `participants`, `members`, `split_detail`, `amount_split`, and similar variants.
- Names and emails both work for payer and participants.
- Amounts may include `₹`, `$`, commas, and whitespace.
- Dates may be ISO (`2026-04-15`) or slash formatted (`15/04/2026` or `04/15/2026`).
- Exact split values are interpreted in the original expense currency, then converted to group base currency.
- `share` split rows are converted into percentage splits from share weights.
- `unequal` split rows are treated as exact amount splits from `split_detail`.
- Duplicate cleanup is never automatic; Meera's approval requirement is handled by `duplicate_review_requests`.

## Database Schema Summary

Core tables:

- `users`: login identity and password hash.
- `groups`: expense group with base currency and soft delete.
- `group_members`: join date, leave date, and role.
- `exchange_rates`: historical conversion rates.
- `expenses`: original and base amounts, currency, payer, split type, and import lineage.
- `expense_participants`: participant owed amounts in base currency.
- `settlements`: payments between members.
- `import_batches`: import run metadata.
- `import_rows`: raw and normalized row data plus action taken.
- `import_anomalies`: row-level anomaly list.
- `duplicate_review_requests`: approval workflow for duplicate removal.
- `audit_logs`: before/after snapshots for edits and deletions.

The full schema is in `backend/src/db/schema.sql`.

## Final Import Report

The provided `expenses_export.csv` is not present in this workspace yet. To generate the final report required by the assignment:

1. Put `expenses_export.csv` anywhere on your computer.
2. Login as `aisha@example.com` with password `password123`.
3. Open `Flatmates Feb-Apr`.
4. Click `Upload CSV`.
5. Select the exact file without editing it.
6. The app will show rows imported, rows skipped, every anomaly detected, and the action taken.
