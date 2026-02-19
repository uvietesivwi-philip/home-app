const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.join(__dirname, '..', '..', 'web', 'js', 'config.js');
const configText = fs.readFileSync(configPath, 'utf8');

test('config keeps mock mode enabled for local MVP', () => {
  assert.match(configText, /USE_MOCK_DATA\s*:\s*true/);
});
