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

function assertRequired(config) {
  const required = [
    ['CONSINCO_API', config.apiHost],
    ['CONSINCO_COMPANY', config.company],
    ['CONSINCO_USER', config.username],
    ['CONSINCO_PWD', config.password],
    ['CONSINCO_SEQ_CONCORRENTE', config.seqConcorrente],
    ['CONSINCO_SEQ_LISTA', config.seqLista],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Configuracoes ausentes para Consinco: ${missing.join(', ')}`);
  }
}

function buildEmpresas(empresasJson) {
  try {
    const parsed = JSON.parse(empresasJson || '[]');
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // fallback handled below
  }

  throw new Error('CONSINCO_EMPRESAS_JSON invalido. Informe um JSON array valido.');
}

function buildDataPesquisa(config) {
  if (config.dataPesquisa) {
    return config.dataPesquisa;
  }

  return new Date().toISOString().slice(0, 10);
}

function buildBody(config, rows) {
  const empresas = buildEmpresas(config.empresasJson);

  const produtos = rows.map((row) => ({
    codacesso: row.EAN,
    vlrprecopraticado: row.PRECOPOR,
    tipprecoconcor: 'N',
    indsimilar: 'N',
  }));

  return {
    seqlista: config.seqLista,
    seqconcorrente: config.seqConcorrente,
    dtapesquisa: buildDataPesquisa(config),
    empresas,
    produtos,
  };
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return {
      status: response.status,
      ok: response.ok,
      text,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestToken(config) {
  const loginUrl = `https://${config.apiHost}.grpereira.com.br:${config.apiPort}/api/v1/auth/login`;

  const response = await fetchJsonWithTimeout(
    loginUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: config.company,
        username: config.username,
        password: config.password,
      }),
    },
    config.timeoutMs
  );

  if (!response.ok || !response.json || !response.json.access_token) {
    throw new Error(`Falha ao obter token Consinco (status ${response.status}): ${response.text}`);
  }

  return `Bearer ${response.json.access_token}`;
}

async function integrateConsinco(config, rows) {
  if (!config.enabled) {
    return { enabled: false, skipped: true, reason: 'CONSINCO_ENABLED=false' };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { enabled: true, skipped: true, reason: 'Sem produtos para integrar' };
  }

  assertRequired(config);

  const body = buildBody(config, rows);

  if (!Array.isArray(body.empresas) || body.empresas.length === 0) {
    throw new Error('CONSINCO_EMPRESAS_JSON vazio. Informe ao menos uma empresa para integracao.');
  }

  const token = await requestToken(config);

  const saveUrl = `https://${config.apiHost}.grpereira.com.br:${config.apiPort}/FSWSUP-5018_PesquisaConcorrente/api/v1/Default/Salvar`;

  const response = await fetchJsonWithTimeout(
    saveUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(body),
    },
    config.timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Falha na integracao Consinco (status ${response.status}): ${response.text}`);
  }

  return {
    enabled: true,
    skipped: false,
    success: true,
    status: response.status,
    response: response.json || response.text,
  };
}

module.exports = {
  persistConsincoPayload,
  integrateConsinco,
};
