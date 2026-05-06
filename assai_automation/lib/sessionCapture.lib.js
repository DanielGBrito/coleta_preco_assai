const fs = require('fs');
const { chromium } = require('playwright');

async function captureSession(config) {
  const browser = await chromium.launch({
    headless: config.browser.headless,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: config.browser.viewport,
  });

  const page = await context.newPage();

  let headersCapturados = null;
  let requestUrlCapturada = null;

  page.on('request', async (request) => {
    try {
      const url = request.url();

      const isMenuRequest =
        url.includes('/site-api/v1/merchants/multicategory/') &&
        url.includes(`/catalog?category_items_size=${config.sizes.categoryItemsSize}`);

      if (!headersCapturados && isMenuRequest) {
        headersCapturados = await request.allHeaders();
        requestUrlCapturada = url;
      }
    } catch (err) {
      console.error('Erro ao capturar request de menu:', err.message);
    }
  });

  await page.goto(config.urls.storeUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  const start = Date.now();
  while (!headersCapturados && Date.now() - start < config.browser.captureTimeoutMs) {
    await page.waitForTimeout(500);
  }

  if (!headersCapturados) {
    await browser.close();
    throw new Error('Nao foi possivel capturar headers da request de catalogo/menu.');
  }

  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  const payload = {
    capturedAt: new Date().toISOString(),
    requestUrl: requestUrlCapturada,
    headers: headersCapturados,
    cookieHeader,
  };

  fs.writeFileSync(config.output.headersCapturedPath, JSON.stringify(payload, null, 2), 'utf-8');

  await browser.close();

  return payload;
}

module.exports = {
  captureSession,
};
