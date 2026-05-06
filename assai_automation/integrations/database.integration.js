const fs = require('fs');

async function persistDbImportPayload(rows, filePath) {
  const payload = {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    source: 'assai_automation',
    rows,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

module.exports = {
  persistDbImportPayload,
};
