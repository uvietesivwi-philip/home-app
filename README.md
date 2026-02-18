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
