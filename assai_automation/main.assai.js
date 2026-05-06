const fs = require('fs');
const path = require('path');

require('./config/env.config');
const config = require('./config/assai.config');

const { captureSession } = require('./lib/sessionCapture.lib');
const { buildProductHeaders } = require('./lib/headers.lib');
const { getJson, resetSslSessionState } = require('./lib/httpClient.lib');
const { extractCatalogs, mapCatalogItemsToRows } = require('./lib/catalog.lib');
const { writeCsv } = require('./lib/csv.lib');
const { sleep } = require('./lib/wait.lib');

const { CatalogRedisQueue } = require('./queue/redis.queue');
const { persistDbImportPayload } = require('./integrations/database.integration');
const { persistConsincoPayload } = require('./integrations/consinco.integration');

function ensureOutputStructure() {
  fs.mkdirSync(config.output.baseDir, { recursive: true });
  fs.mkdirSync(config.output.catalogsDir, { recursive: true });
}

async function run() {
  resetSslSessionState();
  ensureOutputStructure();

  console.log('=== ASSAI AUTOMATION ===');
  console.log('Capturando sessao e headers via browser...');

  const capturedSession = await captureSession(config);
  const headersProdutos = buildProductHeaders(
    capturedSession.headers,
    capturedSession.cookieHeader,
    config.urls.storeUrl
  );

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

        const rows = mapCatalogItemsToRows(catalogResponse.json, job.name, config);
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

    writeCsv(allRows, config.output.csvPath);
    await persistDbImportPayload(allRows, config.output.dbPayloadPath);
    await persistConsincoPayload(allRows, config.output.consincoPayloadPath);

    const report = {
      generatedAt: new Date().toISOString(),
      merchantId: config.merchantId,
      totalCatalogs: catalogs.length,
      totalRows: allRows.length,
      failures,
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
