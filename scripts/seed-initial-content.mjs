#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hasArg(flag) {
  return process.argv.includes(flag);
}

function toTimestampOrValue(value) {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return Timestamp.fromDate(new Date(parsed));
    }
  }
  return value;
}

async function loadSeedFile(filename) {
  const fullPath = path.join(__dirname, 'seed-data', filename);
  const file = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(file);
}

function initFirebase() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

async function seedTaxonomy(db, taxonomyRows, applyChanges) {
  const collectionName = 'contentTaxonomy';
  for (const row of taxonomyRows) {
    const payload = {
      ...row,
      isActive: true,
      updatedAt: Timestamp.now()
    };
    if (applyChanges) {
      await db.collection(collectionName).doc(row.id).set(payload, { merge: true });
    }
  }
  return `${taxonomyRows.length} taxonomy docs`; 
}

async function seedContent(db, contentRows, applyChanges) {
  const collectionName = 'content';
  for (const row of contentRows) {
    const payload = Object.fromEntries(
      Object.entries({
        ...row,
        createdAt: toTimestampOrValue(row.createdAt),
        updatedAt: Timestamp.now(),
        status: 'published'
      }).filter(([, value]) => value !== undefined)
    );

    if (applyChanges) {
      await db.collection(collectionName).doc(row.id).set(payload, { merge: true });
    }
  }
  return `${contentRows.length} content docs`;
}

async function main() {
  const applyChanges = hasArg('--apply');

  const [taxonomyRows, contentRows] = await Promise.all([
    loadSeedFile('content-taxonomy.json'),
    loadSeedFile('sample-content.json')
  ]);

  const db = initFirebase();
  const ops = await Promise.all([
    seedTaxonomy(db, taxonomyRows, applyChanges),
    seedContent(db, contentRows, applyChanges)
  ]);

  console.log(`${applyChanges ? 'Applied' : 'Dry run:'} ${ops.join(', ')}.`);
  if (!applyChanges) {
    console.log('Run with --apply to write to Firestore.');
  }
}

main().catch((error) => {
  console.error('Seed script failed.');
  console.error(error);
  process.exitCode = 1;
});
