const https = require('https');
const zlib = require('zlib');
const {
  createTlsAgentFromEnv,
  isSslCertificateError,
  canAutoFallbackToInsecure,
} = require('./tls.lib');

let forceInsecureForSession = ['1', 'true', 'yes'].includes(
  String(process.env.IFOOD_INSECURE_SSL || '').toLowerCase()
);

function decodeBody(buffer, contentEncoding) {
  const rawEncoding = Array.isArray(contentEncoding) ? contentEncoding[0] : contentEncoding;
  const encoding = String(rawEncoding || '').toLowerCase().split(',')[0].trim();

  if (!encoding || encoding === 'identity') {
    return buffer;
  }

  if (encoding === 'gzip' || encoding === 'x-gzip') {
    return zlib.gunzipSync(buffer);
  }

  if (encoding === 'deflate') {
    return zlib.inflateSync(buffer);
  }

  if (encoding === 'br') {
    return zlib.brotliDecompressSync(buffer);
  }

  return buffer;
}

function requestText(url, headers, agent, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers,
        agent,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const compressedBody = Buffer.concat(chunks);

          let decodedBody;
          try {
            decodedBody = decodeBody(compressedBody, res.headers['content-encoding']);
          } catch (err) {
            reject(new Error(`Falha ao descompactar resposta: ${err.message}`));
            return;
          }

          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            text: decodedBody.toString('utf-8'),
            headers: res.headers,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout na requisicao (${timeoutMs}ms): ${url}`));
    });

    req.on('error', reject);
    req.end();
  });
}

async function getJson(url, headers, timeoutMs) {
  const insecureAgent = createTlsAgentFromEnv({ allowInsecure: true });

  if (forceInsecureForSession) {
    const response = await requestText(url, headers, insecureAgent, timeoutMs);
    return { ...response, json: JSON.parse(response.text) };
  }

  const secureAgent = createTlsAgentFromEnv();

  try {
    const response = await requestText(url, headers, secureAgent, timeoutMs);
    return { ...response, json: JSON.parse(response.text) };
  } catch (err) {
    if (!isSslCertificateError(err) || !canAutoFallbackToInsecure()) {
      throw err;
    }

    forceInsecureForSession = true;
    console.warn('[SSL] Falha na validacao TLS. Ativando fallback inseguro para o restante da execucao.');

    const response = await requestText(url, headers, insecureAgent, timeoutMs);
    return { ...response, json: JSON.parse(response.text) };
  }
}

function resetSslSessionState() {
  forceInsecureForSession = ['1', 'true', 'yes'].includes(
    String(process.env.IFOOD_INSECURE_SSL || '').toLowerCase()
  );
}

module.exports = {
  getJson,
  resetSslSessionState,
};
