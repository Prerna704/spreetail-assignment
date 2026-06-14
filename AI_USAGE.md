# AI Usage

AI was used as a development collaborator for architecture, code scaffolding, debugging, and documentation. I remain responsible for the code and reviewed the generated output against the assignment requirements.

## Tools Used

- OpenAI Codex in the local coding environment.

## Key Prompts

- "Build a production-ready Shared Expense Management application similar to Splitwise using React, Express, PostgreSQL, and JWT."
- "Fix why the app shows Internal Server Error during registration."
- "Add authentication, group management, member join/leave date, edit/delete group, and member management features."
- "Make this match the assignment document with messy CSV import, anomaly handling, traceability, and approval workflow."

## Concrete AI Mistakes Caught and Fixed

1. Wrong route mounting:
   - AI initially mounted group routes at `/api`, while the frontend called `/api/groups`.
   - Symptom: creating groups silently failed with `Route not found: POST /api/groups`.
   - Fix: mounted `groupRoutes` at `/api/groups` in `backend/src/app.js`.

2. CSV identity matching was too strict:
   - Initial importer expected participant emails only.
   - Problem: assignment spreadsheets often use names like Aisha or Rohan.
   - Fix: importer now matches both normalized names and emails.

3. Exact split conversion was incomplete:
   - Initial split code compared exact split values directly to converted base amount.
   - Problem: USD exact splits would be treated like INR.
   - Fix: exact participant amounts are converted using the same historical exchange rate as the expense.

4. Frontend member management used UUIDs:
   - Initial UI asked for `User UUID`, which is not user-friendly in a live demo.
   - Fix: backend accepts registered email and frontend now adds/removes members by email.

5. Duplicate detection was too narrow:
   - Initial duplicate check only flagged same amount duplicates.
   - Problem: assignment mentions duplicate-like entries with inconsistent amounts.
   - Fix: duplicate detection now flags same date, payer, and description even when amounts differ.

## Review Strategy

- Ran backend route tests directly through PowerShell.
- Ran `npm run lint`.
- Ran `npm run build`.
- Checked `npm audit --audit-level=high`.
- Manually verified backend `/health` and frontend `localhost:5173`.
