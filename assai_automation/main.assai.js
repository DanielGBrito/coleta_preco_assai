const fs = require('fs');
const path = require('path');

require('./config/env.config');
const config = require('./config/assai.config');

const { loadProductHeaders } = require('./lib/headers.lib');
const { getJson, resetSslSessionState } = require('./lib/httpClient.lib');
const { extractCatalogs, mapCatalogItemsToRows } = require('./lib/catalog.lib');
const { writeCsv } = require('./lib/csv.lib');
const { sleep } = require('./lib/wait.lib');

const { CatalogRedisQueue } = require('./queue/redis.queue');
const { persistDbImportPayload, integrateDatabase } = require('./integrations/database.integration');
const { persistConsincoPayload, integrateConsinco } = require('./integrations/consinco.integration');
const { sendResultEmail } = require('./integrations/email.integration');

function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

function ensureOutputStructure() {
  fs.mkdirSync(config.output.baseDir, { recursive: true });
  fs.mkdirSync(config.output.catalogsDir, { recursive: true });
}

async function run() {
  const executionStartedAt = new Date();
  const executionDateToken = formatDateDDMMYYYY(executionStartedAt);

  resetSslSessionState();
  ensureOutputStructure();

  console.log('=== ASSAI AUTOMATION ===');
  console.log('Carregando headers de arquivo (modo API-only)...');

  const headersProdutos = loadProductHeaders(config);

  fs.writeFileSync(config.output.headersProductsPath, JSON.stringify(headersProdutos, null, 2), 'utf-8');

  console.log('Consultando menu geral de catalogos...');
  const menuResponse = await getJson(config.urls.menuUrl, headersProdutos, config.request.timeoutMs);

  fs.writeFileSync(config.output.menuPath, JSON.stringify(menuResponse.json, null, 2), 'utf-8');

  const catalogs = extractCatalogs(menuResponse.json);
  if (catalogs.length === 0) {
    throw new Error('Nenhum catalogo encontrado na resposta de menu.');
  }

  console.log(`Catalogos encontrados: ${catalogs.length}`);

  const queue = new CatalogRedisQueue(config.redis);
  await queue.connect();

  try {
    await queue.resetRunKeys();

    const inserted = await queue.enqueueCatalogs(catalogs);
    const statsBefore = await queue.getStats();
    console.log(`Catalogos adicionados na fila Redis: ${inserted}`);
    console.log(`Pendentes na fila: ${statsBefore.pending}`);

    const allRows = [];
    const allCatalogResponses = [];
    const failures = [];

    while (true) {
      const job = await queue.popCatalog();
      if (!job) break;

      console.log(`Processando catalogo: ${job.name} (${job.code})`);

      await sleep(config.request.intervalMs);

      const catalogUrl = config.urls.catalogUrl(job.code);

      try {
        const catalogResponse = await getJson(catalogUrl, headersProdutos, config.request.timeoutMs);

        allCatalogResponses.push({
          code: job.code,
          name: job.name,
          status: catalogResponse.status,
          payload: catalogResponse.json,
        });

        fs.writeFileSync(
          path.join(config.output.catalogsDir, `${job.code}.json`),
          JSON.stringify(catalogResponse.json, null, 2),
          'utf-8'
        );

        const rows = mapCatalogItemsToRows(catalogResponse.json, job.name, config, {
          collectedAtIso: executionStartedAt.toISOString(),
        });
        allRows.push(...rows);
      } catch (err) {
        console.error(`Falha no catalogo ${job.code}: ${err.message}`);
        failures.push({
          code: job.code,
          name: job.name,
          error: err.message,
        });
      }
    }

    fs.writeFileSync(config.output.responseAggregatePath, JSON.stringify(allCatalogResponses, null, 2), 'utf-8');

    await writeCsv(allRows, config.output.csvPath);
    await persistDbImportPayload(allRows, config.output.dbPayloadPath);
    await persistConsincoPayload(allRows, config.output.consincoPayloadPath);

    let databaseResult;
    try {
      databaseResult = await integrateDatabase(config.database, allRows, {
        merchantId: config.merchantId,
        seqConcorrente: config.consinco.seqConcorrente,
        seqLista: config.consinco.seqLista,
      });

      if (databaseResult.skipped) {
        console.log(`[DB] Persistencia ignorada: ${databaseResult.reason}`);
      } else {
        console.log(`[DB] Persistencia concluida. Linhas inseridas: ${databaseResult.rowsInserted}`);
      }
    } catch (err) {
      databaseResult = {
        enabled: config.database.enabled,
        skipped: false,
        success: false,
        error: err.message,
      };
      console.error(`[DB] Erro na persistencia: ${err.message}`);
    }

    let consincoResult;
    try {
      consincoResult = await integrateConsinco(config.consinco, allRows);
      if (consincoResult.skipped) {
        console.log(`[CONSINCO] Integracao ignorada: ${consincoResult.reason}`);
      } else {
        console.log('[CONSINCO] Integracao concluida com sucesso.');
      }
    } catch (err) {
      consincoResult = {
        enabled: config.consinco.enabled,
        skipped: false,
        success: false,
        error: err.message,
      };
      console.error(`[CONSINCO] Erro na integracao: ${err.message}`);
    }

    let emailResult;
    try {
      emailResult = await sendResultEmail(config.email, {
        csvPath: config.output.csvPath,
        totalRows: allRows.length,
        failuresCount: failures.length,
        executionDate: executionStartedAt,
        attachmentFilename: `${config.email.attachmentPrefix}${executionDateToken}.csv`,
      });

      if (emailResult.skipped) {
        console.log(`[EMAIL] Envio ignorado: ${emailResult.reason}`);
      } else {
        console.log('[EMAIL] E-mail enviado com sucesso.');
      }
    } catch (err) {
      emailResult = {
        enabled: config.email.enabled,
        skipped: false,
        success: false,
        error: err.message,
      };
      console.error(`[EMAIL] Erro no envio: ${err.message}`);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      merchantId: config.merchantId,
      totalCatalogs: catalogs.length,
      totalRows: allRows.length,
      failures,
      integrations: {
        database: databaseResult,
        consinco: consincoResult,
        email: emailResult,
      },
      requestTimeoutMs: config.request.timeoutMs,
      requestIntervalMs: config.request.intervalMs,
      output: config.output,
    };

    fs.writeFileSync(config.output.processReportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('=== PROCESSO FINALIZADO ===');
    console.log(`Produtos consolidados: ${allRows.length}`);
    console.log(`Falhas: ${failures.length}`);
    console.log(`CSV: ${config.output.csvPath}`);
  } finally {
    await queue.close();
  }
}

run().catch((err) => {
  console.error('ERRO GERAL:', err.message);
  process.exit(1);
});
