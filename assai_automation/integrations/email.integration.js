const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function validateEmailConfig(config) {
  const required = [
    ['SMTP_HOST', config.host],
    ['SMTP_PORT', config.port],
    ['SMTP_USER', config.user],
    ['SMTP_PWD', config.password],
    ['SMTP_DESTINOS', config.destinos],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Configuracoes ausentes para email: ${missing.join(', ')}`);
  }
}

function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

async function sendResultEmail(config, context) {
  if (!config.enabled) {
    return { enabled: false, skipped: true, reason: 'EMAIL_ENABLED=false' };
  }

  validateEmailConfig(config);

  if (!fs.existsSync(context.csvPath)) {
    throw new Error(`CSV para anexo nao encontrado: ${context.csvPath}`);
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  const executionDate = context.executionDate || new Date();
  const dataRef = formatDateDDMMYYYY(executionDate);
  const attachmentFilename = context.attachmentFilename
    || `${config.attachmentPrefix}${dataRef}.csv`;
  const subject = `${config.assuntoPrefixo} - ${dataRef}`;
  const body = [
    'Segue em anexo o CSV de coleta do Assai.',
    '',
    `Total de produtos: ${context.totalRows}`,
    `Total de falhas: ${context.failuresCount}`,
    `Data de execucao: ${new Date().toISOString()}`,
  ].join('\n');

  const info = await transporter.sendMail({
    from: config.user,
    to: config.destinos,
    subject,
    text: body,
    attachments: [
      {
        filename: attachmentFilename || path.basename(context.csvPath),
        path: context.csvPath,
      },
    ],
  });

  return {
    enabled: true,
    skipped: false,
    success: true,
    messageId: info.messageId,
    response: info.response,
  };
}

module.exports = {
  sendResultEmail,
};
