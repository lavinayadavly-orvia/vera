import { readFileSync } from 'node:fs';
import path from 'node:path';

function applyEnvFile(filePath) {
  let raw = '';
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const projectRoot = process.cwd();
applyEnvFile(path.join(projectRoot, '.env'));
applyEnvFile(path.join(projectRoot, '.env.local'));
