# Shared Expense Management

Production-ready Splitwise-style application for the flatmate expense assignment. Built with React, Tailwind CSS, Node.js, Express, PostgreSQL, and JWT authentication.

## What Is Included

- JWT authentication with register, login, and protected API routes.
- Group lifecycle with members, join dates, leave dates, and soft deletion.
- Expenses with categories, payer, participants, equal, percentage, and exact split modes.
- INR/USD support with historical exchange rates stored by effective date.
- Group balance engine with individual summaries, simplified debt settlement, and traceability entries.
- Settlements for recording payments and marking debts as settled through ledger impact.
- CSV import with flexible header normalization, row-level anomaly detection, and import reports.
- Audit trail for creates, edits, deletions, imports, and duplicate-removal approvals.
- Duplicate expense review workflow requiring explicit approval before removal.

## Assignment Demo Login

Run `backend/src/db/seed.sql` after the schema to create the assignment group and users.

| User | Email | Password |
| --- | --- | --- |
| Aisha | `aisha@example.com` | `password123` |
| Rohan | `rohan@example.com` | `password123` |
| Priya | `priya@example.com` | `password123` |
| Meera | `meera@example.com` | `password123` |
| Sam | `sam@example.com` | `password123` |
| Dev | `dev@example.com` | `password123` |

Seeded group: `Flatmates Feb-Apr`.

## Folder Structure

```text
backend/
  src/
    config/          Database and environment setup
    controllers/     HTTP request handlers
    db/              PostgreSQL schema and seed data
    middleware/      Auth, validation, uploads, errors
    models/          SQL persistence modules
    routes/          REST route definitions
    services/        Currency, split, balance, CSV, anomaly, audit logic
    validators/      Zod request schemas
frontend/
  src/
    api/             Axios client
    components/      Layout and route guards
    context/         Auth state
    pages/           App workflows
docs/                Supporting architecture notes
```

## Local Setup

```bash
npm install
cp backend/.env.example backend/.env
npm run db:schema --workspace backend
psql "$DATABASE_URL" -f backend/src/db/seed.sql
npm run dev
```

The frontend runs on `http://localhost:5173`; the API runs on `http://localhost:4000`.

For Windows PowerShell, edit `backend/.env` manually and run:

```powershell
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/shared_expenses" -f backend/src/db/schema.sql
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/shared_expenses" -f backend/src/db/seed.sql
npm run dev --workspace backend
npm run dev --workspace frontend
```

## REST API Design

| Area | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| Auth | POST | `/api/auth/register` | Create user and return JWT |
| Auth | POST | `/api/auth/login` | Login and return JWT |
| Auth | GET | `/api/auth/me` | Read current user |
| Groups | GET/POST | `/api/groups` | List and create groups |
| Groups | GET/PATCH/DELETE | `/api/groups/:groupId` | Read, update, soft-delete group |
| Members | POST/DELETE | `/api/groups/:groupId/members` | Add member or set leave date |
| Expenses | GET/POST | `/api/groups/:groupId/expenses` | List and create expenses |
| Expenses | GET/PUT/DELETE | `/api/expenses/:expenseId` | Read, edit, soft-delete expense |
| Settlements | GET/POST | `/api/groups/:groupId/settlements` | List and record payments |
| Settlements | DELETE | `/api/settlements/:settlementId` | Soft-delete settlement |
| Balances | GET | `/api/groups/:groupId/balances` | Summary, simplified debts, trace |
| Imports | POST | `/api/groups/:groupId/imports/csv` | Upload and process CSV |
| Imports | GET | `/api/imports/:importId/report` | Read import report |
| Currency | GET/POST | `/api/exchange-rates` | Read and upsert rates |
| Audit | GET | `/api/audit-logs` | Read recent audit records |
| Duplicates | GET/POST | `/api/duplicates` | List or request duplicate removal |
| Duplicates | POST | `/api/duplicates/:requestId/approve` | Approve duplicate deletion |

## CSV Format

The importer accepts common header aliases without manual CSV edits. It supports names or emails for people, currency symbols, slash dates, comma-separated participants, and common split labels.

Recommended headers:

```csv
date,description,category,amount,currency,paid_by_email,split_type,participants,percentages,exact_amounts,entry_type
2026-01-15,Dinner,Food,1200,INR,alex@example.com,EQUAL,alex@example.com;sam@example.com,,,
2026-01-16,Hotel,Travel,300,USD,sam@example.com,PERCENTAGE,alex@example.com;sam@example.com,alex@example.com:40;sam@example.com:60,,
```

For exact splits, values are entered in the expense currency and converted to the group base currency using the historical rate.

To import the assignment file:

1. Login as `aisha@example.com`.
2. Open `Flatmates Feb-Apr`.
3. Click `Upload CSV`.
4. Select the exact `expenses_export.csv`.
5. Review the import report for anomalies and actions.

## Balance Algorithm

1. Start every group member at zero in the group base currency.
2. For each expense, credit the payer by the converted base amount.
3. Debit each participant by their owed base amount.
4. For each settlement, credit the payer and debit the receiver because the payment reduces what the payer owes.
5. Summaries are the resulting net positions.
6. Simplified debts pair negative balances with positive balances greedily until all balances are near zero.
7. Traceability is returned as the exact expense and settlement ledger entries used in the calculation.

## Anomaly Detection

The CSV pipeline reports duplicate expenses, invalid dates, negative amounts, missing members, invalid currency, settlement-like entries, inactive members on expense date, invalid split totals, and blank required fields. Blocking anomalies skip the row. Duplicate anomalies are warnings that import the row but flag it for review, so removal still requires user approval.

The anomaly policy and schema summary are documented in `SCOPE.md`.

## Live Session Navigation

- Aisha's request: open a group, go to `Balances`, read simplified debts.
- Rohan's request: open `Balances`, inspect `Traceability`.
- Priya's request: inspect `exchange_rates`, `expenses.base_amount`, and `expenses.exchange_rate`.
- Sam's request: inspect `group_members.join_date` and `MEMBER_INACTIVE_ON_EXPENSE_DATE`.
- Meera's request: inspect duplicate warnings and `duplicate_review_requests`.

## Deployment

### Neon PostgreSQL

1. Create a Neon project and database.
2. Copy the pooled or direct connection string. Neon documents that connection strings include role, password, host, and database, and require SSL/TLS.
3. Run `psql "<DATABASE_URL>" -f backend/src/db/schema.sql`.
4. Run `psql "<DATABASE_URL>" -f backend/src/db/seed.sql` or insert real historical rates.

Reference: https://neon.tech/docs/connect/connect-from-any-app

### Render Backend

1. Create a Render Web Service connected to the repository.
2. Set root directory to the repository root.
3. Use build command `npm install`.
4. Use start command `npm run start --workspace backend`.
5. Set `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, and `NODE_ENV=production`.
6. Render exposes a `PORT`; the backend reads `PORT` from the environment.

References: https://render.com/docs/deploy-node-express-app and https://render.com/docs/configure-environment-variables

### Vercel Frontend

1. Import the repo into Vercel.
2. Set the project root directory to `frontend`.
3. Use build command `npm run build`.
4. Use output directory `dist`.
5. Set `VITE_API_URL=https://your-render-service.onrender.com/api`.

Vite client environment variables must be prefixed with `VITE_`.

Reference: https://vercel.com/docs/frameworks/frontend/vite

## Architecture Decisions

See `DECISIONS.md` for the detailed rationale.
