const path = require('path');

const merchantId = process.env.MERCHANT_ID || '57add8af-d999-4a29-924a-c70c25c72f45';
const categoryItemsSize = Number(process.env.CATEGORY_ITEMS_SIZE || 12);
const catalogItemsSize = Number(process.env.CATALOG_ITEMS_SIZE || 5000);

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisPassword = process.env.REDIS_PASSWORD || process.env.REDIS_PWD || '';
const redisDb = Number(process.env.REDIS_DB || 0);

function isTruthy(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

const outputDir = path.resolve(__dirname, '../output');
const headersFilePath = process.env.IFOOD_HEADERS_FILE
  ? path.resolve(process.env.IFOOD_HEADERS_FILE)
  : path.join(outputDir, 'headers_produtos.json');

function encodePath(value) {
  return encodeURIComponent(value);
}

module.exports = {
  merchantId,
  collection: {
    tipo: process.env.COLETA_TIPO || 'Atacado',
    cep: process.env.COLETA_CEP || '',
    cidade: process.env.COLETA_CIDADE || '',
    bairro: process.env.COLETA_BAIRRO || '',
  },
  sizes: {
    categoryItemsSize,
    catalogItemsSize,
  },
  request: {
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 5000),
    intervalMs: Number(process.env.REQUEST_INTERVAL_MS || 5000),
  },
  input: {
    headersFilePath,
    cookieOverride: process.env.IFOOD_COOKIE || '',
  },
  consinco: {
    enabled: isTruthy(process.env.CONSINCO_ENABLED, false),
    apiHost: process.env.CONSINCO_API || '',
    apiPort: Number(process.env.CONSINCO_API_PORT || 443),
    company: process.env.CONSINCO_COMPANY || '',
    username: process.env.CONSINCO_USER || '',
    password: process.env.CONSINCO_PWD || '',
    seqConcorrente: process.env.CONSINCO_SEQ_CONCORRENTE || '',
    seqLista: process.env.CONSINCO_SEQ_LISTA || '',
    dataPesquisa: process.env.CONSINCO_DATA_PESQUISA || '',
    empresasJson: process.env.CONSINCO_EMPRESAS_JSON || '[]',
    timeoutMs: Number(process.env.CONSINCO_TIMEOUT_MS || 180000),
  },
  database: {
    enabled: isTruthy(process.env.DB_ENABLED, false),
    dwUrl: process.env.DW_URL_DB || '',
    dwUser: process.env.DW_USER_DB || '',
    dwPassword: process.env.DW_PWD_DB || '',
    connectTimeoutMs: Number(process.env.DB_CONNECT_TIMEOUT_MS || 60000),
  },
  email: {
    enabled: isTruthy(process.env.EMAIL_ENABLED, false),
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: isTruthy(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PWD || '',
    destinos: process.env.SMTP_DESTINOS || '',
    assuntoPrefixo: process.env.EMAIL_ASSUNTO_PREFIXO || 'Produtos coletados do concorrente Assai',
    attachmentPrefix: process.env.EMAIL_ANEXO_PREFIX || 'coletaTotalAssai',
  },
  browser: {
    headless: String(process.env.HEADLESS || 'false').toLowerCase() === 'true',
    captureTimeoutMs: 30000,
    viewport: { width: 1400, height: 900 },
  },
  urls: {
    storeUrl: `https://www.ifood.com.br/delivery/sao-paulo-sp/assai---nacoes-unidas-vila-almeida/${merchantId}`,
    menuUrl: `https://www.ifood.com.br/site-api/v1/merchants/multicategory/${merchantId}/catalog?category_items_size=${categoryItemsSize}`,
    catalogUrl: (catalogCode) => (
      `https://cw-marketplace.ifood.com.br/v1/merchants/multicategory/${merchantId}/catalog/${encodePath(catalogCode)}?items_page=1&items_size=${catalogItemsSize}`
    ),
    productLink: (itemId) => (
      `https://www.ifood.com.br/delivery/sao-paulo-sp/assai---nacoes-unidas-vila-almeida/${merchantId}?item=${encodePath(itemId)}`
    ),
    photoBaseUrl: 'https://static.ifood-static.com.br/image/upload/t_low/pratos/',
  },
  redis: {
    url: `redis://${redisHost}:${redisPort}`,
    password: redisPassword || undefined,
    database: redisDb,
    queueKey: `digitalPriceFinder:Assai:catalogs:${merchantId}`,
    dedupeSetKey: `digitalPriceFinder:Assai:catalogs:dedupe:${merchantId}`,
  },
  output: {
    baseDir: outputDir,
    catalogsDir: path.join(outputDir, 'catalogs'),
    headersCapturedPath: path.join(outputDir, 'headers_capturados.json'),
    headersProductsPath: path.join(outputDir, 'headers_produtos.json'),
    menuPath: path.join(outputDir, 'menu_catalogos.json'),
    responseAggregatePath: path.join(outputDir, 'produtos_response.json'),
    csvPath: path.join(outputDir, 'produtos.csv'),
    processReportPath: path.join(outputDir, 'process_report.json'),
    dbPayloadPath: path.join(outputDir, 'db_import_payload.json'),
    consincoPayloadPath: path.join(outputDir, 'consinco_payload.json'),
  },
};
