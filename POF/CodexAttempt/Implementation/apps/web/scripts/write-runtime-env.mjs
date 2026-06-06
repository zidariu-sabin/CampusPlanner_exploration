import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..');
const envPath = resolve(appRoot, '.env');
const outputPath = resolve(appRoot, 'public', 'env.js');

const defaults = {
  CAMPUS_API_BASE_URL: 'http://localhost:3000',
  MAPBOX_ACCESS_TOKEN: '',
  MAPBOX_STYLE_URL: 'mapbox://styles/mapbox/standard-satellite',
};

const parseDotEnv = (source) => {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

let envValues = {};

try {
  envValues = parseDotEnv(readFileSync(envPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

const config = {
  apiBaseUrl: envValues.CAMPUS_API_BASE_URL ?? defaults.CAMPUS_API_BASE_URL,
  mapboxAccessToken: envValues.MAPBOX_ACCESS_TOKEN ?? defaults.MAPBOX_ACCESS_TOKEN,
  mapboxStyleUrl: envValues.MAPBOX_STYLE_URL ?? defaults.MAPBOX_STYLE_URL,
};

const json = JSON.stringify(config, null, 2)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `window.__CAMPUS_PLANNER_ENV__ = Object.freeze(${json});\n`,
  { mode: 0o600 },
);
