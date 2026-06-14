function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows, headers) {
  const headerLine = headers.map((header) => escapeCell(header.label)).join(',');
  const bodyLines = rows.map((row) =>
    headers.map((header) => escapeCell(row[header.key])).join(',')
  );
  return [headerLine, ...bodyLines].join('\n');
}

export function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
