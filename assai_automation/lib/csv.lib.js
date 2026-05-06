const fs = require('fs');

function escapeCsv(value) {
  if (value === null || value === undefined) return '';

  let text = value;
  if (typeof text === 'object') {
    text = JSON.stringify(text);
  }

  text = String(text);

  if (text.includes('"')) {
    text = text.replace(/"/g, '""');
  }

  if (text.includes(',') || text.includes('\n') || text.includes('\r') || text.includes('"')) {
    return `"${text}"`;
  }

  return text;
}

function writeCsv(rows, filePath) {
  if (!Array.isArray(rows) || rows.length === 0) {
    fs.writeFileSync(filePath, '', 'utf-8');
    return;
  }

  const columns = Object.keys(rows[0]);
  const csvRows = [columns.join(',')];

  for (const row of rows) {
    const line = columns.map((column) => escapeCsv(row[column]));
    csvRows.push(line.join(','));
  }

  fs.writeFileSync(filePath, csvRows.join('\n'), 'utf-8');
}

module.exports = {
  writeCsv,
};
