const fs = require('fs');
const https = require('https');
const path = require('path');

const MERCHANT_ID = '57add8af-d999-4a29-924a-c70c25c72f45';
const STORE_SLUG = 'assai---nacoes-unidas-vila-almeida';

const URL_LOJA =
  `https://www.ifood.com.br/delivery/sao-paulo-sp/${STORE_SLUG}/${MERCHANT_ID}`;

const URL_MENU =
  `https://www.ifood.com.br/site-api/v1/merchants/multicategory/${MERCHANT_ID}/catalog?category_items_size=12`;

const URL_PRODUTOS = (catalogCode) =>
  `https://cw-marketplace.ifood.com.br/v1/merchants/multicategory/${MERCHANT_ID}/catalog/${encodeURIComponent(catalogCode)}?items_page=1&items_size=5000`;

const URL_FOTO_BASE =
  'https://static.ifood-static.com.br/image/upload/t_low/pratos/';

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
const REQUEST_INTERVAL_MS = Number(process.env.REQUEST_INTERVAL_MS || 5000);
const HEADERS_FILE = process.env.IFOOD_HEADERS_FILE || path.resolve('headers_produtos.json');
const AUTO_FALLBACK_INSECURE_SSL = ['1', 'true', 'yes'].includes(
  String(process.env.IFOOD_AUTO_FALLBACK_INSECURE_SSL || '1').toLowerCase()
);

let forceInsecureForSession = ['1', 'true', 'yes'].includes(
  String(process.env.IFOOD_INSECURE_SSL || '').toLowerCase()
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHeader(obj, key) {
  const source = obj || {};
  const found = Object.keys(source).find((k) => k.toLowerCase() === key.toLowerCase());
  return found ? source[found] : undefined;
}

function buildHeadersFromCaptured(captured) {
  const cookieHeader = process.env.IFOOD_COOKIE || getHeader(captured, 'cookie') || '';

  const headersProdutos = {
    'browser': getHeader(captured, 'browser'),
    'sec-ch-ua-platform': getHeader(captured, 'sec-ch-ua-platform'),
    'sec-ch-ua': getHeader(captured, 'sec-ch-ua'),
    'sec-ch-ua-mobile': getHeader(captured, 'sec-ch-ua-mobile'),
    'x-device-model': getHeader(captured, 'x-device-model'),
    'Accept': getHeader(captured, 'accept') || 'application/json, text/plain, */*',
    'X-Ifood-Session-Id': getHeader(captured, 'x-ifood-session-id'),
    'access_key': getHeader(captured, 'access_key'),
    'platform': getHeader(captured, 'platform'),
    'x-client-application-key': getHeader(captured, 'x-client-application-key'),
    'X-Ifood-Device-Id': getHeader(captured, 'x-ifood-device-id'),
    'Cache-Control': getHeader(captured, 'cache-control'),
    'Referer': getHeader(captured, 'referer') || URL_LOJA,
    'accept-language': getHeader(captured, 'accept-language'),
    'secret_key': getHeader(captured, 'secret_key'),
    'app_version': getHeader(captured, 'app_version'),
    'User-Agent': getHeader(captured, 'user-agent'),
    'x-px-cookies': getHeader(captured, 'x-px-cookies'),
    'Cookie': cookieHeader,
  };

  return Object.fromEntries(
    Object.entries(headersProdutos).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function loadHeaders() {
  if (!fs.existsSync(HEADERS_FILE)) {
    throw new Error(`Arquivo de headers nao encontrado: ${HEADERS_FILE}. Defina IFOOD_HEADERS_FILE ou gere headers_produtos.json.`);
  }

  const raw = fs.readFileSync(HEADERS_FILE, 'utf-8');
  const json = JSON.parse(raw);

  let headers = json;
  if (json && typeof json === 'object' && json.headers) {
    headers = buildHeadersFromCaptured(json.headers);
  }

  if (process.env.IFOOD_COOKIE) {
    headers.Cookie = process.env.IFOOD_COOKIE;
  }

  return Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => !key.startsWith(':') && value !== undefined && value !== null && value !== '')
  );
}

function createTlsAgentFromEnv() {
  const caBundlePath = process.env.IFOOD_CA_BUNDLE || process.env.SSL_CERT_FILE || process.env.NODE_EXTRA_CA_CERTS;
  const insecureMode = ['1', 'true', 'yes'].includes(String(process.env.IFOOD_INSECURE_SSL || '').toLowerCase());

  if (caBundlePath) {
    const ca = fs.readFileSync(caBundlePath, 'utf-8');
    return new https.Agent({
      keepAlive: true,
      rejectUnauthorized: true,
      ca,
    });
  }

  if (insecureMode) {
    console.warn('ATENCAO: IFOOD_INSECURE_SSL habilitado. A validacao TLS foi desativada apenas para teste.');
    return new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
    });
  }

  return new https.Agent({
    keepAlive: true,
    rejectUnauthorized: true,
  });
}

async function getWithSmartSslFallback(url, headers, contextLabel) {
  const insecureAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false,
  });

  if (forceInsecureForSession) {
    return httpGet(url, headers, insecureAgent);
  }

  try {
    const tlsAgent = createTlsAgentFromEnv();
    return await httpGet(url, headers, tlsAgent);
  } catch (err) {
    if (!isSslCertificateError(err)) {
      throw err;
    }

    if (!AUTO_FALLBACK_INSECURE_SSL) {
      throw err;
    }

    forceInsecureForSession = true;
    console.warn(`[SSL] Falha na validacao TLS em ${contextLabel}. Ativando fallback inseguro para o restante da execucao.`);
    return httpGet(url, headers, insecureAgent);
  }
}

function httpGet(url, headers, agent) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers,
        agent,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            text: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Timeout na requisicao de produtos.'));
    });

    req.on('error', reject);
    req.end();
  });
}

function isSslCertificateError(err) {
  const sslCodes = [
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
  ];

  return sslCodes.includes(err?.code) || /self-signed certificate/i.test(String(err?.message || ''));
}

function extractCatalogs(menuJson) {
  if (Array.isArray(menuJson?.data?.menu)) {
    return menuJson.data.menu
      .map((item) => ({ code: item?.code, name: item?.name || '' }))
      .filter((item) => Boolean(item.code));
  }

  if (menuJson?.data?.categoryMenu?.code) {
    return [{
      code: menuJson.data.categoryMenu.code,
      name: menuJson.data.categoryMenu.name || '',
    }];
  }

  return [];
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';

  let str = value;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  }

  str = String(str);

  if (str.includes('"')) {
    str = str.replace(/"/g, '""');
  }

  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str}"`;
  }

  return str;
}

function montarCsvItensCatalogo(jsonCatalogo) {
  const nomeCategoria = jsonCatalogo?.data?.categoryMenu?.name || '';
  const itens = jsonCatalogo?.data?.categoryMenu?.itens;

  if (!Array.isArray(itens) || itens.length === 0) {
    return '';
  }

  const colunas = [
    'EAN',
    'URL',
    'NOME',
    'PRECODE',
    'PRECOPOR',
    'URLFOTO',
    'SKUID',
    'DEPARTAMENTO',
    'CATEGORIA',
  ];

  const linhas = [colunas.join(',')];

  for (const item of itens) {
    const urlItem = `${URL_LOJA}?item=${item?.id || ''}`;
    const precode = item?.unitPrice ?? '';
    const precoporCalculado = Array.isArray(item?.scalePrices)
      ? (item.scalePrices.find((sp) => sp && sp.price !== undefined && sp.price !== null)?.price ?? '')
      : '';
    const precopor = precoporCalculado === '' ? precode : precoporCalculado;
    const skuid = item?.externalCode ?? '';
    const urlFoto = item?.logoUrl ? `${URL_FOTO_BASE}${item.logoUrl}` : '';

    const linha = [
      item?.ean ?? '',
      urlItem,
      item?.description ?? '',
      precode,
      precopor,
      urlFoto,
      skuid,
      nomeCategoria,
      nomeCategoria,
    ].map(escapeCsv);

    linhas.push(linha.join(','));
  }

  return linhas.join('\n');
}

(async () => {
  const headersLimpos = loadHeaders();

  fs.writeFileSync(
    'headers_produtos.json',
    JSON.stringify(headersLimpos, null, 2),
    'utf-8'
  );

  console.log('\n=== HEADERS DA REQUISIÇÃO DE PRODUTOS ===');
  console.log(JSON.stringify(headersLimpos, null, 2));

  console.log('\n=== CONSULTANDO MENU DE CATALOGOS ===');

  const menuResponse = await getWithSmartSslFallback(URL_MENU, headersLimpos, 'menu');

  if (menuResponse.status === 403) {
    throw new Error('403 no endpoint de menu. Tokens/cookies estao expirados ou bloqueados. Atualize headers_produtos.json (ou IFOOD_COOKIE).');
  }

  const menuJson = JSON.parse(menuResponse.text);
  const catalogs = extractCatalogs(menuJson);

  if (catalogs.length === 0) {
    throw new Error('Nenhum catalogo encontrado no endpoint de menu.');
  }

  console.log(`Catalogos encontrados: ${catalogs.length}`);

  const respostasCatalogo = [];
  const csvLinhas = [];
  let falhas = 0;

  for (let i = 0; i < catalogs.length; i += 1) {
    const catalog = catalogs[i];
    if (i > 0) {
      await sleep(REQUEST_INTERVAL_MS);
    }

    const urlCatalogo = URL_PRODUTOS(catalog.code);

    const response = await getWithSmartSslFallback(urlCatalogo, headersLimpos, `catalogo ${catalog.code}`);

    console.log(`Catalogo ${i + 1}/${catalogs.length} | ${catalog.name} | status: ${response.status}`);

    if (response.status === 403) {
      falhas += 1;
      respostasCatalogo.push({
        code: catalog.code,
        name: catalog.name,
        status: response.status,
        statusText: response.statusText,
        error: 'Forbidden',
      });
      continue;
    }

    try {
      const json = JSON.parse(response.text);
      const csvCatalogo = montarCsvItensCatalogo(json);
      const linhas = csvCatalogo.split('\n').filter(Boolean);

      if (linhas.length > 1) {
        csvLinhas.push(...linhas.slice(1));
      }

      respostasCatalogo.push({
        code: catalog.code,
        name: catalog.name,
        status: response.status,
        payload: json,
      });
    } catch {
      falhas += 1;
      respostasCatalogo.push({
        code: catalog.code,
        name: catalog.name,
        status: response.status,
        statusText: response.statusText,
        rawText: response.text,
      });
    }
  }

  fs.writeFileSync('menu_response.json', JSON.stringify(menuJson, null, 2), 'utf-8');
  fs.writeFileSync('produtos_response.json', JSON.stringify(respostasCatalogo, null, 2), 'utf-8');

  const colunas = ['EAN', 'URL', 'NOME', 'PRECODE', 'PRECOPOR', 'URLFOTO', 'SKUID', 'DEPARTAMENTO', 'CATEGORIA'];
  const csvFinal = [colunas.join(','), ...csvLinhas].join('\n');
  fs.writeFileSync('produtos.csv', csvFinal, 'utf-8');

  console.log('\n=== PROCESSO FINALIZADO (API ONLY) ===');
  console.log(`Linhas no CSV: ${csvLinhas.length}`);
  console.log(`Falhas: ${falhas}`);
  console.log('Arquivos gerados: menu_response.json, produtos_response.json, produtos.csv');
})().catch((err) => {
  console.error('\nERRO GERAL:', err.message);
  process.exit(1);
});
