import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesPath = path.join(__dirname, '..', '..', 'firestore.rules');
const indexesPath = path.join(__dirname, '..', '..', 'firestore.indexes.json');

const rulesText = fs.readFileSync(rulesPath, 'utf8');

test('firestore rules include expected service and match blocks', () => {
  assert.match(rulesText, /service\s+cloud\.firestore/);
  assert.match(rulesText, /match\s+\/databases\/\{database\}\/documents/);
});

test('firestore indexes are valid json and include index definitions', () => {
  const indexes = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
  assert.ok(Array.isArray(indexes.indexes));
});
