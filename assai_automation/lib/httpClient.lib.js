const https = require('https');
const {
  createTlsAgentFromEnv,
  isSslCertificateError,
  canAutoFallbackToInsecure,
} = require('./tls.lib');

let forceInsecureForSession = ['1', 'true', 'yes'].includes(
  String(process.env.IFOOD_INSECURE_SSL || '').toLowerCase()
);

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
          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            text: Buffer.concat(chunks).toString('utf-8'),
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
