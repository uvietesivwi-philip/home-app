/**
 * Example callable function guard for admin claim assignment.
 * This file is intended to be used from a trusted Cloud Functions environment.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

exports.assignAdminClaim = onCall(async (request) => {
  const caller = request.auth;
  if (!caller) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  // Restrict claim assignment to a tighter "superAdmin" role.
  if (caller.token?.superAdmin !== true) {
    throw new HttpsError('permission-denied', 'superAdmin claim required.');
  }

  const { uid, admin: adminEnabled } = request.data || {};
  if (!uid || typeof adminEnabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Provide uid and boolean admin.');
  }

  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const nextClaims = { ...(user.customClaims || {}), admin: adminEnabled };

  await auth.setCustomUserClaims(uid, nextClaims);
  await auth.revokeRefreshTokens(uid);

  return { uid, admin: adminEnabled, revokedRefreshTokens: true };
});
