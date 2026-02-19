import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '..', '..', 'web', 'js', 'config.js');
const configText = fs.readFileSync(configPath, 'utf8');

test('config keeps mock mode enabled for local MVP', () => {
  assert.match(configText, /USE_MOCK_DATA\s*:\s*true/);
});
