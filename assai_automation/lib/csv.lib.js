const fs = require('fs');

const UTF8_BOM = '\uFEFF';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function writeWithRetry(filePath, content, retries = 5, waitMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return;
    } catch (err) {
      const lockError = err && (err.code === 'EBUSY' || err.code === 'EPERM');
      lastError = err;

      if (!lockError || attempt === retries) {
        throw err;
      }

      await sleep(waitMs);
    }
  }

  throw lastError;
}

async function writeCsv(rows, filePath) {
  if (!Array.isArray(rows) || rows.length === 0) {
    await writeWithRetry(filePath, UTF8_BOM);
    return;
  }

  const columns = Object.keys(rows[0]);
  const csvRows = [columns.join(',')];

  for (const row of rows) {
    const line = columns.map((column) => escapeCsv(row[column]));
    csvRows.push(line.join(','));
  }

  // Excel on Windows reliably detects UTF-8 when BOM is present.
  await writeWithRetry(filePath, `${UTF8_BOM}${csvRows.join('\r\n')}`);
}

module.exports = {
  writeCsv,
};
