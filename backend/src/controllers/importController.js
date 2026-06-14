import { ApiError } from '../utils/ApiError.js';
import { getGroupById } from '../models/groupModel.js';
import { getImportReport, importExpensesFromCsv } from '../models/importModel.js';
import { sendCsv, toCsv } from '../utils/csv.js';

export async function uploadExpenseCsv(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  if (!req.file) throw new ApiError(400, 'CSV file is required');
  const report = await importExpensesFromCsv({ group, file: req.file, actorId: req.user.id });
  res.status(201).json({ report });
}

export async function getReport(req, res) {
  res.json({ report: await getImportReport(req.params.importId) });
}

export async function exportReport(req, res) {
  const report = await getImportReport(req.params.importId);
  const rows = report.anomalies.map((anomaly) => ({
    rowNumber: anomaly.rowNumber,
    type: anomaly.type,
    message: anomaly.message,
    severity: anomaly.severity,
    actionTaken: anomaly.actionTaken
  }));
  const csv = toCsv(rows, [
    { key: 'rowNumber', label: 'row' },
    { key: 'type', label: 'type' },
    { key: 'message', label: 'message' },
    { key: 'severity', label: 'severity' },
    { key: 'actionTaken', label: 'action_taken' }
  ]);

  sendCsv(res, `${report.filename.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_import_report.csv`, csv);
}
