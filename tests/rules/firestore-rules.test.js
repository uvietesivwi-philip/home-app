const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
