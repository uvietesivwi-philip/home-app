#!/usr/bin/env node
/**
 * Secure operational script to grant/revoke Firebase Auth custom admin claims.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
 *   node backend/admin/set-admin-claim.mjs --uid <uid> --grant
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
 *   node backend/admin/set-admin-claim.mjs --uid <uid> --revoke
 */
import process from 'node:process';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function parseArgs(argv) {
  const args = { uid: null, grant: false, revoke: false, credentials: null };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--uid') args.uid = argv[++i];
    else if (arg === '--grant') args.grant = true;
    else if (arg === '--revoke') args.revoke = true;
    else if (arg === '--credentials') args.credentials = argv[++i];
  }

  if (!args.uid || args.grant === args.revoke) {
    throw new Error('Provide --uid and exactly one of --grant/--revoke.');
  }

  return args;
}

async function main() {
  const { uid, grant, credentials } = parseArgs(process.argv);

  if (credentials) {
    const serviceAccount = JSON.parse(await import('node:fs/promises').then((m) => m.readFile(credentials, 'utf8')));
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }

  const auth = getAuth();
  const user = await auth.getUser(uid);
  const existing = user.customClaims || {};
  const nextClaims = { ...existing, admin: grant };

  await auth.setCustomUserClaims(uid, nextClaims);
  await auth.revokeRefreshTokens(uid);

  console.log(JSON.stringify({ uid, admin: grant, revokedRefreshTokens: true }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
