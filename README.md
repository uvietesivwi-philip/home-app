# home-app

Home Help MVP web app + Firestore planning/security artifacts.

## What is implemented now

A runnable MVP web experience lives under `web/` with:
- Category browsing for Cook/Care/DIY/Family
- Content feed with filter by category/subcategory
- Save content flow
- Continue watching/progress tracking flow
- Service request submission + request note updates
- Admin utility page to seed and review content (mock mode)

## Run locally

From repo root:

```bash
python -m http.server 4173
```

Then open:
- User app: `http://localhost:4173/web/`
- Admin app: `http://localhost:4173/web/admin.html`

## Data mode

`web/js/config.js` uses `USE_MOCK_DATA: true` so the MVP runs without backend setup.
`web/js/config.js` currently uses `USE_MOCK_DATA: true` so the MVP runs without backend setup.

To move to production Firebase mode:
1. Add Firebase config values in `web/js/config.js`.
2. Replace mock store calls in `web/js/store.js` with Firebase SDK calls matching `FIRESTORE_SCREEN_QUERIES.md`.
3. Deploy Firestore rules and indexes from this repo.

## Firestore artifacts included
- `firestore.rules`: production Firestore access controls for MVP data surfaces.
- `firestore.indexes.json`: composite indexes required by MVP query patterns.
- `FIRESTORE_SCREEN_QUERIES.md`: exact Firestore query mapping per app screen.
- `NEXT_STEPS.md`: implementation checklist after baseline setup.
- `MVP_BUILD_TASKS.md`: start-to-finish build checklist.



## Admin claim operations

Secure admin access management and rollback steps are documented in `ADMIN_ACCESS_RUNBOOK.md`.

- Grant/revoke script: `backend/admin/set-admin-claim.mjs`
- Callable backend example with claim guard: `backend/functions/admin-claims.js`
- Firestore rules enforce `request.auth.token.admin` for privileged data operations.

## Deploy to a live server

Fastest path is Firebase Hosting (this repo includes `firebase.json`).

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc
# edit .firebaserc -> your project id
firebase deploy --only hosting
```

For full instructions (including Firestore rules/index deploy and Vercel/Netlify alternatives), see `HOSTING_GUIDE.md`.
