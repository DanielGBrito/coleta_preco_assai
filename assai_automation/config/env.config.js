const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const selectedEnvFile = process.env.ENV_FILE || '.env';
const selectedPath = path.resolve(__dirname, `../${selectedEnvFile}`);
const defaultPath = path.resolve(__dirname, '../.env');

dotenv.config({
  path: fs.existsSync(selectedPath) ? selectedPath : defaultPath,
});
