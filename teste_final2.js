const { chromium } = require('playwright');
const fs = require('fs');

const URL_LOJA =
  'https://www.ifood.com.br/delivery/sao-paulo-sp/assai---nacoes-unidas-vila-almeida/57add8af-d999-4a29-924a-c70c25c72f45';

const URL_PRODUTOS =
  'https://cw-marketplace.ifood.com.br/v1/merchants/multicategory/57add8af-d999-4a29-924a-c70c25c72f45/catalog/ac451afe-b003-47b5-9f41-3254a39e99e6?items_page=1&items_size=5000';

function getHeader(obj, key) {
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? obj[foundKey] : undefined;
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  let headersCapturados = null;

  page.on('request', async (request) => {
    try {
      const url = request.url();

      if (
        !headersCapturados &&
        url.includes('/catalog?category_items_size=12')
      ) {
        headersCapturados = await request.allHeaders();

        fs.writeFileSync(
          'headers_capturados.json',
          JSON.stringify(headersCapturados, null, 2),
          'utf-8'
        );

        console.log('Headers capturados com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao capturar request:', err.message);
    }
  });

  await page.goto(URL_LOJA, {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });

  await page.waitForTimeout(12000);

  if (!headersCapturados) {
    throw new Error('Não foi possível capturar os headers da request de catálogo.');
  }

  const headersProdutos = {
    'accept': getHeader(headersCapturados, 'accept'),
    'accept-language': getHeader(headersCapturados, 'accept-language'),
    'access_key': getHeader(headersCapturados, 'access_key'),
    'app_version': getHeader(headersCapturados, 'app_version'),
    'browser': getHeader(headersCapturados, 'browser'),
    'cache-control': getHeader(headersCapturados, 'cache-control'),
    'origin': getHeader(headersCapturados, 'origin') || 'https://www.ifood.com.br',
    'platform': getHeader(headersCapturados, 'platform'),
    'referer': getHeader(headersCapturados, 'referer') || 'https://www.ifood.com.br/',
    'sec-ch-ua': getHeader(headersCapturados, 'sec-ch-ua'),
    'sec-ch-ua-mobile': getHeader(headersCapturados, 'sec-ch-ua-mobile'),
    'sec-ch-ua-platform': getHeader(headersCapturados, 'sec-ch-ua-platform'),
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'secret_key': getHeader(headersCapturados, 'secret_key'),
    'user-agent': getHeader(headersCapturados, 'user-agent'),
    'x-client-application-key': getHeader(headersCapturados, 'x-client-application-key'),
    'x-device-model': getHeader(headersCapturados, 'x-device-model'),
    'x-ifood-device-id': getHeader(headersCapturados, 'x-ifood-device-id'),
    'x-ifood-session-id': getHeader(headersCapturados, 'x-ifood-session-id'),
    'x-px-cookies': getHeader(headersCapturados, 'x-px-cookies'),
  };

  const headersLimpos = Object.fromEntries(
    Object.entries(headersProdutos).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

  fs.writeFileSync(
    'headers_produtos.json',
    JSON.stringify(headersLimpos, null, 2),
    'utf-8'
  );

  const resultado = await page.evaluate(async ({ url, headers }) => {
    const resp = await fetch(url, {
      method: 'GET',
      headers
    });

    return {
      status: resp.status,
      statusText: resp.statusText,
      body: await resp.text()
    };
  }, {
    url: URL_PRODUTOS,
    headers: headersLimpos
  });

  console.log('STATUS:', resultado.status, resultado.statusText);
  fs.writeFileSync('produtos_response.json', resultado.body, 'utf-8');

  try {
    const json = JSON.parse(resultado.body);
    console.log('JSON retornado com sucesso.');
    console.log('Chaves raiz:', Object.keys(json));
  } catch {
    console.log('Resposta não é JSON válido.');
  }

  await browser.close();
})().catch((err) => {
  console.error('ERRO GERAL:', err.message);
  process.exit(1);
});