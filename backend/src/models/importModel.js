import { withTransaction } from '../config/db.js';
import { getGroupMembers } from './groupModel.js';
import { createExpense } from './expenseModel.js';
import { parseCsv, normalizeCsvRow } from '../services/csvImportService.js';
import { detectRowAnomalies } from '../services/anomalyService.js';
import { summarizeImportReport } from '../services/importReportService.js';

export async function importExpensesFromCsv({ group, file, actorId }) {
  const parsedRows = parseCsv(file.buffer);
  const members = await getGroupMembers(group.id);
  const memberByEmail = new Map(
    members.flatMap((member) => [
      [member.email.toLowerCase(), member],
      [member.name.toLowerCase(), member]
    ])
  );

  return withTransaction(async (client) => {
    const batchResult = await client.query(
      `INSERT INTO import_batches (group_id, filename, rows_total, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [group.id, file.originalname, parsedRows.length, actorId]
    );
    const batch = batchResult.rows[0];
    const reportRows = [];
    let imported = 0;
    let skipped = 0;

    for (const [index, rawRow] of parsedRows.entries()) {
      const rowNumber = index + 2;
      const normalized = normalizeCsvRow(rawRow);
      const anomalies = await detectRowAnomalies({ client, groupId: group.id, row: normalized, memberByEmail });
      const hasBlockingAnomaly = anomalies.some((anomaly) => anomaly.severity === 'error');
      let expense = null;
      let actionTaken = hasBlockingAnomaly ? 'ROW_SKIPPED' : 'IMPORTED';

      if (!hasBlockingAnomaly) {
        const paidBy = memberByEmail.get(normalized.paidBy);
        const participants = normalized.participants.map((participant) => {
          const member = memberByEmail.get(participant.identifier);
          return {
            userId: member.user_id,
            percentage: participant.percentage,
            exactAmount: participant.exactAmount
          };
        });

        try {
          expense = await createExpense(
            {
              groupId: group.id,
              baseCurrency: group.base_currency,
              description: normalized.description,
              category: normalized.category,
              amount: normalized.amount,
              currency: normalized.currency,
              expenseDate: normalized.date,
              paidBy: paidBy.user_id,
              splitType: normalized.splitType,
              participants,
              sourceImportId: batch.id
            },
            actorId,
            client
          );
          imported += 1;
        } catch (error) {
          actionTaken = 'ROW_SKIPPED';
          skipped += 1;
          anomalies.push({
            type: error.message.includes('active member') ? 'MEMBER_INACTIVE_ON_EXPENSE_DATE' : 'INVALID_SPLIT_TOTAL',
            message: error.message,
            severity: 'error',
            actionTaken: 'ROW_SKIPPED'
          });
        }
      } else {
        skipped += 1;
      }

      const rowResult = await client.query(
        `INSERT INTO import_rows
         (import_batch_id, row_number, raw_data, normalized_data, action_taken, expense_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [batch.id, rowNumber, rawRow, normalized, actionTaken, expense?.id ?? null]
      );

      for (const anomaly of anomalies) {
        await client.query(
          `INSERT INTO import_anomalies (import_row_id, type, message, severity, action_taken)
           VALUES ($1, $2, $3, $4, $5)`,
          [rowResult.rows[0].id, anomaly.type, anomaly.message, anomaly.severity, anomaly.actionTaken]
        );
      }

      reportRows.push({
        rowNumber,
        actionTaken,
        expenseId: expense?.id ?? null,
        anomalies
      });
    }

    const updatedBatch = await client.query(
      `UPDATE import_batches
       SET rows_imported = $1, rows_skipped = $2
       WHERE id = $3
       RETURNING *`,
      [imported, skipped, batch.id]
    );

    return summarizeImportReport({ batch: updatedBatch.rows[0], rows: reportRows });
  });
}

export async function getImportReport(importId) {
  return withTransaction(async (client) => {
    const batch = await client.query('SELECT * FROM import_batches WHERE id = $1', [importId]);
    const rows = await client.query(
      `SELECT ir.*,
       COALESCE(
         JSON_AGG(ia.*) FILTER (WHERE ia.id IS NOT NULL),
         '[]'::JSON
       ) AS anomalies
       FROM import_rows ir
       LEFT JOIN import_anomalies ia ON ia.import_row_id = ir.id
       WHERE ir.import_batch_id = $1
       GROUP BY ir.id
       ORDER BY ir.row_number`,
      [importId]
    );

    return summarizeImportReport({
      batch: batch.rows[0],
      rows: rows.rows.map((row) => ({
        rowNumber: row.row_number,
        actionTaken: row.action_taken,
        expenseId: row.expense_id,
        anomalies: row.anomalies.map((anomaly) => ({
          type: anomaly.type,
          message: anomaly.message,
          severity: anomaly.severity,
          actionTaken: anomaly.action_taken
        }))
      }))
    });
  });
}
