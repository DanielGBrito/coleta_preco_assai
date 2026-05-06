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

function assertDatabaseConfig(config) {
  const required = [
    ['DW_URL_DB', config.dwUrl],
    ['DW_USER_DB', config.dwUser],
    ['DW_PWD_DB', config.dwPassword],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Configuracoes ausentes para DB: ${missing.join(', ')}`);
  }
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function integrateDatabase(config, rows, context = {}) {
  if (!config.enabled) {
    return { enabled: false, skipped: true, reason: 'DB_ENABLED=false' };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { enabled: true, skipped: true, reason: 'Sem produtos para persistir' };
  }

  assertDatabaseConfig(config);

  let oracledb;
  try {
    oracledb = require('oracledb');
  } catch (err) {
    throw new Error(`Dependencia oracledb nao encontrada: ${err.message}`);
  }

  const binds = rows.map((row) => {
    const seqConcorrente = row.SEQCONCORRENTE || context.seqConcorrente || null;
    const seqLista = row.SEQLISTA || context.seqLista || null;

    return {
      seqConcorrente,
      ean: row.EAN || null,
      url: row.URL || null,
      nome: row.NOME || null,
      precoDe: toNumberOrNull(row.PRECODE),
      precoPor: toNumberOrNull(row.PRECOPOR),
      urlFoto: row.URLFOTO || null,
      skuId: row.SKUID || null,
      departamento: row.DEPARTAMENTO || null,
      categoria: row.CATEGORIA || null,
      integrado: row.INTEGRADO || '1',
      seqLista,
      parametros: JSON.stringify({
        merchantId: context.merchantId || null,
        cidade: row.CIDADE || null,
        cep: row.CEP || null,
        bairro: row.BAIRRO || null,
        seqLista,
        source: 'assai_automation',
      }),
    };
  });

  const sql = `insert into rpa.tab_coletaprecos_concorrentes_mix_completo t
                    (t.datacoleta, t.seqconcorrente, t.ean, t.url, t.nome, t.precode, t.precopor, t.urlfoto, t.skuid, t.departamento, t.categoria, t.integrado, t.seqlista, t.parametros)
                    values(
                      SYSDATE,
                      :seqConcorrente,
                      :ean,
                      :url,
                      :nome,
                      :precoDe,
                      :precoPor,
                      :urlFoto,
                      :skuId,
                      :departamento,
                      :categoria,
                      :integrado,
                      :seqLista,
                      :parametros
                    )`;

  let connection;
  try {
    connection = await oracledb.getConnection({
      user: config.dwUser,
      password: config.dwPassword,
      connectString: config.dwUrl,
    });

    if (config.connectTimeoutMs && Number(config.connectTimeoutMs) > 0) {
      connection.callTimeout = Number(config.connectTimeoutMs);
    }

    const result = await connection.executeMany(sql, binds, {
      autoCommit: true,
      bindDefs: {
        seqConcorrente: { type: oracledb.STRING, maxSize: 60 },
        ean: { type: oracledb.STRING, maxSize: 60 },
        url: { type: oracledb.STRING, maxSize: 4000 },
        nome: { type: oracledb.STRING, maxSize: 2000 },
        precoDe: { type: oracledb.NUMBER },
        precoPor: { type: oracledb.NUMBER },
        urlFoto: { type: oracledb.STRING, maxSize: 4000 },
        skuId: { type: oracledb.STRING, maxSize: 120 },
        departamento: { type: oracledb.STRING, maxSize: 600 },
        categoria: { type: oracledb.STRING, maxSize: 600 },
        integrado: { type: oracledb.STRING, maxSize: 10 },
        seqLista: { type: oracledb.STRING, maxSize: 60 },
        parametros: { type: oracledb.STRING, maxSize: 4000 },
      },
    });

    return {
      enabled: true,
      skipped: false,
      success: true,
      rowsInserted: result.rowsAffected || binds.length,
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = {
  persistDbImportPayload,
  integrateDatabase,
};
