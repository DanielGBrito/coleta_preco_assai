const { chromium } = require('playwright');
const fs = require('fs');

const URL_LOJA =
  'https://www.ifood.com.br/delivery/sao-paulo-sp/assai---nacoes-unidas-vila-almeida/57add8af-d999-4a29-924a-c70c25c72f45';

const URL_PRODUTOS =
  'https://cw-marketplace.ifood.com.br/v1/merchants/multicategory/57add8af-d999-4a29-924a-c70c25c72f45/catalog/ac451afe-b003-47b5-9f41-3254a39e99e6?items_page=1&items_size=5000';

const URL_FOTO_BASE =
  'https://static.ifood-static.com.br/image/upload/t_low/pratos/';

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
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // remova esta linha se quiser usar o Chromium do Playwright
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  let headersCapturados = null;
  let requestUrlCapturada = null;

  page.on('request', async (request) => {
    try {
      const url = request.url();

      // Ajuste o filtro conforme a request exata que você quer capturar
      const ehRequestCatalogo =
        url.includes('/catalog') &&
        (
          url.includes('category_items_size=12') ||
          url.includes('items_page=1') ||
          url.includes('items_size=')
        );

      if (!headersCapturados && ehRequestCatalogo) {
        const headers = await request.allHeaders();

        headersCapturados = headers;
        requestUrlCapturada = url;

        fs.writeFileSync(
          'headers_capturados.json',
          JSON.stringify(
            {
              capturedAt: new Date().toISOString(),
              requestUrl: requestUrlCapturada,
              headers: headersCapturados,
            },
            null,
            2
          ),
          'utf-8'
        );

        console.log('\n=== HEADERS CAPTURADOS ===');
        console.log('URL:', requestUrlCapturada);
        console.log(JSON.stringify(headersCapturados, null, 2));
      }
    } catch (err) {
      console.error('Erro ao capturar request:', err.message);
    }
  });

  await page.goto(URL_LOJA, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  // Espera as requests da página acontecerem
  await page.waitForTimeout(15000);

  if (!headersCapturados) {
    throw new Error('Nenhuma request de catálogo foi capturada.');
  }

  // Captura cookies do contexto para montar o header Cookie
  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // Função auxiliar para pegar header sem depender de maiúsculo/minúsculo
  const getHeader = (obj, key) => {
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return foundKey ? obj[foundKey] : undefined;
  };

  // Monta os headers da segunda requisição usando os valores capturados
  const headersProdutos = {
    'browser': getHeader(headersCapturados, 'browser'),
    'sec-ch-ua-platform': getHeader(headersCapturados, 'sec-ch-ua-platform'),
    'sec-ch-ua': getHeader(headersCapturados, 'sec-ch-ua'),
    'sec-ch-ua-mobile': getHeader(headersCapturados, 'sec-ch-ua-mobile'),
    'x-device-model': getHeader(headersCapturados, 'x-device-model'),
    'Accept': getHeader(headersCapturados, 'accept') || 'application/json, text/plain, */*',
    'X-Ifood-Session-Id': getHeader(headersCapturados, 'x-ifood-session-id'),
    'access_key': getHeader(headersCapturados, 'access_key'),
    'platform': getHeader(headersCapturados, 'platform'),
    'x-client-application-key': getHeader(headersCapturados, 'x-client-application-key'),
    'X-Ifood-Device-Id': getHeader(headersCapturados, 'x-ifood-device-id'),
    'Cache-Control': getHeader(headersCapturados, 'cache-control'),
    'Referer': getHeader(headersCapturados, 'referer') || 'https://www.ifood.com.br/',
    'accept-language': getHeader(headersCapturados, 'accept-language'),
    'secret_key': getHeader(headersCapturados, 'secret_key'),
    'app_version': getHeader(headersCapturados, 'app_version'),
    'User-Agent': getHeader(headersCapturados, 'user-agent'),
    'x-px-cookies': getHeader(headersCapturados, 'x-px-cookies'),
    'Cookie': cookieHeader,
  };

  // Remove campos vazios/undefined
  const headersLimpos = Object.fromEntries(
    Object.entries(headersProdutos).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

  fs.writeFileSync(
    'headers_produtos.json',
    JSON.stringify(headersLimpos, null, 2),
    'utf-8'
  );

  console.log('\n=== HEADERS DA REQUISIÇÃO DE PRODUTOS ===');
  console.log(JSON.stringify(headersLimpos, null, 2));

  // Segunda requisição: busca os produtos
  const response = await fetch(URL_PRODUTOS, {
    method: 'GET',
    headers: headersLimpos,
  });

  const responseText = await response.text();

  console.log('\n=== STATUS DA REQUISIÇÃO DE PRODUTOS ===');
  console.log(response.status, response.statusText);

  fs.writeFileSync('produtos_response.json', responseText, 'utf-8');

  try {
    const json = JSON.parse(responseText);
    console.log('\n=== JSON DOS PRODUTOS SALVO COM SUCESSO ===');
    console.log(`Quantidade de chaves no objeto raiz: ${Object.keys(json).length}`);

    const csv = montarCsvItensCatalogo(json);
    fs.writeFileSync('produtos.csv', csv, 'utf-8');
    console.log('Arquivo produtos.csv salvo em UTF-8.');
  } catch {
    console.log('\nA resposta não veio como JSON válido. Verifique o arquivo produtos_response.json');
  }

  await browser.close();
})().catch((err) => {
  console.error('\nERRO GERAL:', err.message);
  process.exit(1);
});
