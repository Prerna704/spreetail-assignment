import { SUPPORTED_CURRENCIES } from './currencyService.js';

function isValidDate(value) {
  if (!value) return false;
  const text = String(value).trim();
  const ambiguousSlashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (ambiguousSlashDate && Number(ambiguousSlashDate[1]) <= 12 && Number(ambiguousSlashDate[2]) <= 12) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function add(anomalies, type, message, severity = 'error', actionTaken = 'ROW_SKIPPED') {
  anomalies.push({ type, message, severity, actionTaken });
}

function isInactiveOnDate(member, date) {
  const expenseDate = new Date(date);
  const joinDate = new Date(member.join_date);
  const leaveDate = member.leave_date ? new Date(member.leave_date) : null;
  return expenseDate < joinDate || (leaveDate && expenseDate > leaveDate);
}

export async function detectRowAnomalies({ client, groupId, row, memberByEmail }) {
  const anomalies = [];
  const requiredFields = ['date', 'description', 'amount', 'currency', 'paidBy'];

  for (const field of requiredFields) {
    if (!row[field] && row[field] !== 0) {
      add(anomalies, 'BLANK_REQUIRED_FIELD', `Missing required field: ${field}`);
    }
  }

  if (!isValidDate(row.date)) {
    add(anomalies, 'INVALID_DATE', `Invalid date: ${row.date}`);
  }

  if (!Number.isFinite(row.amount) || row.amount <= 0) {
    add(anomalies, 'NEGATIVE_AMOUNT', `Amount must be positive: ${row.amount}`);
  }

  if (!SUPPORTED_CURRENCIES.includes(row.currency)) {
    add(anomalies, 'INVALID_CURRENCY', `Unsupported currency: ${row.currency}`);
  }

  if (row.entryType.includes('SETTLEMENT') || /settlement|settled|paid\s+back|reimbursement|repaid/i.test(row.description)) {
    add(anomalies, 'SETTLEMENT_LOGGED_AS_EXPENSE', 'Settlement-like entry found in expense import');
  }

  if (!['EQUAL', 'PERCENTAGE', 'EXACT'].includes(row.splitType)) {
    add(anomalies, 'INVALID_SPLIT_TOTAL', `Unsupported split type: ${row.splitType}`);
  }

  const paidByMember = memberByEmail.get(row.paidBy);
  if (!paidByMember) {
    add(anomalies, 'MISSING_MEMBER', `Payer not found in group: ${row.paidBy}`);
  } else if (isValidDate(row.date) && isInactiveOnDate(paidByMember, row.date)) {
    add(anomalies, 'MEMBER_INACTIVE_ON_EXPENSE_DATE', `Payer ${row.paidBy} inactive on ${row.date}`);
  }

  if (!row.participants.length) {
    add(anomalies, 'BLANK_REQUIRED_FIELD', 'Participants are required');
  }

  for (const participant of row.participants) {
    if (participant.identifier === row.paidBy) {
      continue;
    }
    const member = memberByEmail.get(participant.identifier);
    if (!member) {
      add(anomalies, 'MISSING_MEMBER', `Participant not found in group: ${participant.identifier}`);
      continue;
    }
    if (isValidDate(row.date)) {
      if (isInactiveOnDate(member, row.date)) {
        add(anomalies, 'MEMBER_INACTIVE_ON_EXPENSE_DATE', `${participant.identifier} inactive on ${row.date}`);
      }
    }
  }

  if (row.splitType === 'PERCENTAGE') {
    const total = row.participants.reduce((sum, participant) => sum + Number(participant.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      add(anomalies, 'INVALID_SPLIT_TOTAL', `Percentage total is ${total}, expected 100`);
    }
  }

  if (row.splitType === 'EXACT') {
    const total = row.participants.reduce((sum, participant) => sum + Number(participant.exactAmount || 0), 0);
    if (Math.abs(total - row.amount) > 0.01) {
      add(anomalies, 'INVALID_SPLIT_TOTAL', `Exact amount total is ${total}, expected ${row.amount}`);
    }
  }

  if (isValidDate(row.date) && row.description && Number.isFinite(row.amount) && paidByMember) {
    const duplicate = await client.query(
      `SELECT id, amount
       FROM expenses
       WHERE group_id = $1
         AND LOWER(description) = LOWER($2)
         AND expense_date = $3
         AND paid_by = $4
         AND deleted_at IS NULL
       LIMIT 1`,
      [groupId, row.description, row.date, paidByMember.user_id]
    );
    if (duplicate.rows[0]) {
      const amountNote = Number(duplicate.rows[0].amount) === Number(row.amount)
        ? 'same amount'
        : `different amount: existing ${duplicate.rows[0].amount}, incoming ${row.amount}`;
      add(anomalies, 'DUPLICATE_EXPENSE', `Possible duplicate expense ${duplicate.rows[0].id} (${amountNote})`, 'warning', 'REVIEW_REQUIRED');
    }
  }

  return anomalies;
}
