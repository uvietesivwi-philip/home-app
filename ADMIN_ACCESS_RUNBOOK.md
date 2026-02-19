# Admin access runbook

This runbook defines the secure flow for granting/revoking `admin` custom claims and handling emergency rollback.

## Security model

- Client apps (including `web/`) must **never** ship Firebase Admin SDK credentials.
- Admin claim assignment must run from trusted server environments only:
  - a secure operator script (`backend/admin/set-admin-claim.mjs`), or
  - a callable backend function (`backend/functions/admin-claims.js`) that enforces `superAdmin` claim checks.
- Firestore privileged operations use `request.auth.token.admin == true` in `firestore.rules`.

## Grant admin access (normal operation)

1. Operator verifies approval ticket/change record for target UID.
2. Operator runs script from a secure machine:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
node backend/admin/set-admin-claim.mjs --uid <TARGET_UID> --grant
```

3. Operator asks user to sign out/in (or waits for token refresh) because custom claims are token-bound.
4. Verify access by checking admin-only path behavior (e.g., content write operation).

## Revoke admin access (normal operation)

```bash
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
node backend/admin/set-admin-claim.mjs --uid <TARGET_UID> --revoke
```

- Script revokes refresh tokens immediately.
- User must re-authenticate to receive claim removal.

## Emergency rollback (compromised or excessive admin access)

1. Revoke claims for all impacted UIDs using `--revoke`.
2. Revoke/rotate service account key used for claim management.
3. Temporarily disable privileged writes by deploying restrictive rules (set `content` writes to `false`) if needed.
4. Audit Cloud Logging/Auth events for the incident timeline.
5. Re-issue least-privilege access only after incident closure.

## Backend callable option

If using the callable function path (`assignAdminClaim`):

- Deploy function in a protected project.
- Ensure only caller tokens with `superAdmin: true` can assign/revoke admin claims.
- Keep invocation surface private to trusted internal admin tooling.

## Client environment requirements

- Keep `web/js/config.js` limited to Firebase client SDK config only (`apiKey`, `authDomain`, `projectId`, `appId`).
- Do not add service account JSON, private keys, or Admin SDK initialization code to client bundles.
