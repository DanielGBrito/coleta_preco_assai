const fs = require('fs');

async function persistConsincoPayload(rows, filePath) {
  const payload = {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    source: 'assai_automation',
    rows: rows.map((row) => ({
      ean: row.EAN,
      descricao: row.NOME,
      precoDe: row.PRECODE,
      precoPor: row.PRECOPOR,
      skuId: row.SKUID,
      departamento: row.DEPARTAMENTO,
      categoria: row.CATEGORIA,
      urlFoto: row.URLFOTO,
      urlProduto: row.URL,
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

module.exports = {
  persistConsincoPayload,
};
