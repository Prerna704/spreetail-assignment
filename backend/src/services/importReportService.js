export function summarizeImportReport({ batch, rows }) {
  const anomalies = rows.flatMap((row) =>
    row.anomalies.map((anomaly) => ({
      rowNumber: row.rowNumber,
      type: anomaly.type,
      message: anomaly.message,
      severity: anomaly.severity,
      actionTaken: anomaly.actionTaken
    }))
  );

  return {
    importId: batch.id,
    filename: batch.filename,
    rowsTotal: batch.rows_total,
    rowsImported: batch.rows_imported,
    rowsSkipped: batch.rows_skipped,
    anomalies,
    rows: rows.map((row) => ({
      rowNumber: row.rowNumber,
      actionTaken: row.actionTaken,
      expenseId: row.expenseId,
      anomalies: row.anomalies
    }))
  };
}
