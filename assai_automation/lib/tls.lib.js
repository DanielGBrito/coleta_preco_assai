const fs = require('fs');
const https = require('https');

function isTruthyEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

function isSslCertificateError(err) {
  const sslCodes = [
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
  ];

  return sslCodes.includes(err && err.code) || /self-signed certificate/i.test(String((err && err.message) || ''));
}

function createTlsAgentFromEnv(options = {}) {
  const allowInsecure = options.allowInsecure || false;
  const caBundlePath = process.env.IFOOD_CA_BUNDLE || process.env.SSL_CERT_FILE || process.env.NODE_EXTRA_CA_CERTS;

  if (caBundlePath) {
    const ca = fs.readFileSync(caBundlePath, 'utf-8');
    return new https.Agent({
      keepAlive: true,
      rejectUnauthorized: true,
      ca,
    });
  }

  if (allowInsecure || isTruthyEnv(process.env.IFOOD_INSECURE_SSL, false)) {
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

function canAutoFallbackToInsecure() {
  return isTruthyEnv(process.env.IFOOD_AUTO_FALLBACK_INSECURE_SSL, true);
}

module.exports = {
  createTlsAgentFromEnv,
  isSslCertificateError,
  canAutoFallbackToInsecure,
};
