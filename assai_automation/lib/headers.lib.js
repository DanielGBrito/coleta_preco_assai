const fs = require('fs');

function getHeader(obj, key) {
  const source = obj || {};
  const keys = Object.keys(source);
  const found = keys.find((item) => item.toLowerCase() === key.toLowerCase());
  return found ? source[found] : undefined;
}

function buildProductHeaders(capturedHeaders, cookieHeader, referrer) {
  const headersProdutos = {
    browser: getHeader(capturedHeaders, 'browser'),
    'sec-ch-ua-platform': getHeader(capturedHeaders, 'sec-ch-ua-platform'),
    'sec-ch-ua': getHeader(capturedHeaders, 'sec-ch-ua'),
    'sec-ch-ua-mobile': getHeader(capturedHeaders, 'sec-ch-ua-mobile'),
    'x-device-model': getHeader(capturedHeaders, 'x-device-model'),
    Accept: getHeader(capturedHeaders, 'accept') || 'application/json, text/plain, */*',
    'X-Ifood-Session-Id': getHeader(capturedHeaders, 'x-ifood-session-id'),
    access_key: getHeader(capturedHeaders, 'access_key'),
    platform: getHeader(capturedHeaders, 'platform'),
    'x-client-application-key': getHeader(capturedHeaders, 'x-client-application-key'),
    'X-Ifood-Device-Id': getHeader(capturedHeaders, 'x-ifood-device-id'),
    'Cache-Control': getHeader(capturedHeaders, 'cache-control'),
    Referer: getHeader(capturedHeaders, 'referer') || referrer,
    'accept-language': getHeader(capturedHeaders, 'accept-language'),
    secret_key: getHeader(capturedHeaders, 'secret_key'),
    app_version: getHeader(capturedHeaders, 'app_version'),
    'User-Agent': getHeader(capturedHeaders, 'user-agent'),
    'x-px-cookies': getHeader(capturedHeaders, 'x-px-cookies'),
    Cookie: cookieHeader,
  };

  return Object.fromEntries(
    Object.entries(headersProdutos).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function sanitizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).filter(([key, value]) => !key.startsWith(':') && value !== undefined && value !== null && value !== '')
  );
}

function loadProductHeaders(config) {
  const filePath = config.input.headersFilePath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de headers nao encontrado: ${filePath}. Defina IFOOD_HEADERS_FILE com um JSON valido.`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  let headers = parsed;
  if (parsed && typeof parsed === 'object' && parsed.headers) {
    const cookieHeader = config.input.cookieOverride || parsed.cookieHeader || getHeader(parsed.headers, 'cookie') || '';
    headers = buildProductHeaders(parsed.headers, cookieHeader, config.urls.storeUrl);
  }

  if (config.input.cookieOverride) {
    headers.Cookie = config.input.cookieOverride;
  }

  return sanitizeHeaders(headers);
}

module.exports = {
  getHeader,
  buildProductHeaders,
  loadProductHeaders,
};
