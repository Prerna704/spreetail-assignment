import { parse } from 'csv-parse/sync';
import { ApiError } from '../utils/ApiError.js';

const headerAliases = {
  date: ['date', 'expense_date', 'paid_on', 'spent_on', 'transaction_date'],
  description: ['description', 'note', 'expense', 'title', 'item', 'details'],
  category: ['category', 'type', 'expense_type'],
  amount: ['amount', 'total', 'value', 'cost', 'price'],
  currency: ['currency', 'currency_code', 'curr'],
  paidBy: ['paid_by', 'paid_by_email', 'payer', 'payer_email', 'paid_by_name', 'who_paid'],
  splitType: ['split_type', 'split', 'split_method', 'division'],
  participants: ['participants', 'members', 'split_between', 'split_with', 'shared_by', 'people'],
  percentages: ['percentages', 'percentage_split', 'percent_split', 'split_percentages'],
  exactAmounts: ['exact_amounts', 'exact_split', 'amount_split', 'split_amounts'],
  splitDetail: ['split_detail', 'split_details', 'details_of_split'],
  entryType: ['entry_type', 'transaction_type', 'record_type', 'notes']
};

const splitAliases = {
  EQUAL: ['EQUAL', 'EQUALLY', 'EVEN', 'EVENLY'],
  PERCENTAGE: ['PERCENTAGE', 'PERCENT', 'PERCENTAGES', '%'],
  EXACT: ['EXACT', 'EXACT_AMOUNT', 'AMOUNT', 'EXACT_AMOUNTS'],
  SHARE: ['SHARE', 'SHARES'],
  UNEQUAL: ['UNEQUAL', 'CUSTOM']
};

function compactHeader(header) {
  return String(header || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function pick(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  return '';
}

function parseList(value) {
  return String(value || '')
    .split(/[;,|/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIdentifier(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+[a-z]$/, '')
    .replace(/\s+/g, ' ');
}

function parseAmount(value) {
  const cleaned = String(value || '')
    .replace(/[$,]/g, '')
    .replace(/\s+/g, '')
    .replace(/%$/, '')
    .trim();
  return Number(cleaned);
}

function normalizeCurrency(rawCurrency, rawAmount) {
  const direct = String(rawCurrency || '').trim().toUpperCase();
  if (direct === 'RS' || direct === 'RUPEE' || direct === 'RUPEES') return 'INR';
  if (direct === '$' || direct === 'DOLLAR' || direct === 'DOLLARS') return 'USD';
  if (direct === 'INR' || direct === 'USD') return direct;

  const amountText = String(rawAmount || '');
  if (amountText.includes('$')) return 'USD';
  return direct;
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashDate) {
    const [, first, second, rawYear] = slashDate;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    if (Number(first) <= 12 && Number(second) <= 12) {
      return text;
    }
    const dayFirst = Number(first) > 12;
    const month = dayFirst ? second : first;
    const day = dayFirst ? first : second;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
}

function normalizeSplitType(value) {
  const text = String(value || 'EQUAL').trim().toUpperCase().replace(/[-\s]+/g, '_');
  for (const [splitType, aliases] of Object.entries(splitAliases)) {
    if (aliases.includes(text)) return splitType;
  }
  return text;
}

function parseKeyValueList(value) {
  return parseList(value)
    .map((item) => {
      const colonMatch = item.match(/^(.+?)\s*[:=]\s*(-?\d+(?:\.\d+)?%?)\s*$/);
      if (colonMatch) {
        return { key: colonMatch[1], value: colonMatch[2] };
      }

      const spaceMatch = item.match(/^(.+?)\s+(-?\d+(?:\.\d+)?%?)\s*$/);
      if (spaceMatch) {
        return { key: spaceMatch[1], value: spaceMatch[2] };
      }

      return { key: item, value: '' };
    })
    .filter((item) => item.key && item.value !== '');
}

function parseDetailMap(value) {
  return new Map(
    parseKeyValueList(value).map((item) => [
      normalizeIdentifier(item.key),
      {
        numeric: parseAmount(item.value),
        isPercent: String(item.value).includes('%')
      }
    ])
  );
}

function mergeParticipantIdentifiers(participants, detailMap) {
  const seen = new Set();
  const merged = [];

  for (const participant of participants) {
    const identifier = normalizeIdentifier(participant);
    if (identifier && !seen.has(identifier)) {
      seen.add(identifier);
      merged.push(identifier);
    }
  }

  for (const identifier of detailMap.keys()) {
    if (identifier && !seen.has(identifier)) {
      seen.add(identifier);
      merged.push(identifier);
    }
  }

  return merged;
}

function applySplitDetails({ rawSplitType, participants, detailMap }) {
  if (rawSplitType === 'PERCENTAGE') {
    return {
      splitType: 'PERCENTAGE',
      participants: participants.map((identifier) => ({
        identifier,
        percentage: detailMap.get(identifier)?.numeric
      }))
    };
  }

  if (rawSplitType === 'SHARE') {
    const totalShares = participants.reduce((sum, identifier) => sum + Number(detailMap.get(identifier)?.numeric || 0), 0);
    return {
      splitType: 'PERCENTAGE',
      participants: participants.map((identifier) => ({
        identifier,
        percentage: totalShares > 0 ? (Number(detailMap.get(identifier)?.numeric || 0) / totalShares) * 100 : undefined
      }))
    };
  }

  if (rawSplitType === 'UNEQUAL') {
    return {
      splitType: 'EXACT',
      participants: participants.map((identifier) => ({
        identifier,
        exactAmount: detailMap.get(identifier)?.numeric
      }))
    };
  }

  return null;
}

export function parseCsv(buffer) {
  try {
    return parse(buffer, {
      columns: (headers) => headers.map(compactHeader),
      bom: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    throw new ApiError(400, 'CSV could not be parsed', error.message);
  }
}

export function normalizeCsvRow(row) {
  const normalized = Object.fromEntries(
    Object.entries(headerAliases).map(([field, aliases]) => [field, pick(row, aliases)])
  );

  const rawSplitType = normalizeSplitType(normalized.splitType);
  const rawParticipants = parseList(normalized.participants);
  const detailMap = parseDetailMap(normalized.splitDetail);
  const participants = mergeParticipantIdentifiers(rawParticipants, detailMap);
  const percentageMap = new Map(
    parseKeyValueList(normalized.percentages).map((item) => [normalizeIdentifier(item.key), parseAmount(item.value)])
  );
  const exactMap = new Map(
    parseKeyValueList(normalized.exactAmounts).map((item) => [normalizeIdentifier(item.key), parseAmount(item.value)])
  );
  const detailedSplit = applySplitDetails({ rawSplitType, participants, detailMap });
  const finalParticipants = detailedSplit?.participants ?? participants.map((identifier) => ({ identifier }));

  return {
    raw: row,
    date: normalizeDate(normalized.date),
    description: normalized.description,
    category: normalized.category || 'General',
    amount: parseAmount(normalized.amount),
    currency: normalizeCurrency(normalized.currency, normalized.amount),
    paidBy: normalizeIdentifier(normalized.paidBy),
    splitType: detailedSplit?.splitType ?? rawSplitType,
    entryType: normalized.entryType.toUpperCase().trim(),
    participants: finalParticipants.map((participant) => {
      const normalizedParticipant = normalizeIdentifier(participant.identifier);
      return {
        identifier: normalizedParticipant,
        email: normalizedParticipant,
        percentage: participant.percentage ?? (percentageMap.has(normalizedParticipant) ? percentageMap.get(normalizedParticipant) : undefined),
        exactAmount: participant.exactAmount ?? (exactMap.has(normalizedParticipant) ? exactMap.get(normalizedParticipant) : undefined)
      };
    })
  };
}
