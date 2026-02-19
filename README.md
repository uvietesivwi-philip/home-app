# home-app

Home Help MVP web app + Firestore planning/security artifacts.

## Repository layout (monorepo)

```text
.
├── apps/
│   ├── mobile/
│   ├── web/
│   └── admin/
├── firebase/
├── web/                      # legacy MVP static web assets (current runnable implementation)
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

### Top-level app/modules

- `apps/mobile`: Mobile client module and env contract.
- `apps/web`: Web client module and env contract.
- `apps/admin`: Admin module and env contract.
- `firebase/`: Firebase infrastructure/deployment module and env contract.

> Note: the current MVP implementation still runs from `web/` while migration into `apps/web` and `apps/admin` is staged.

## Environment variable contracts

Each module contains a checked-in `.env.example` file documenting required variables.

### Shared contract categories

1. **Firebase client config keys**
   - API key
   - Auth domain
   - Project ID
   - Storage bucket
   - Messaging sender ID
   - App ID
   - Measurement ID
2. **Project IDs for release environments**
   - `*_PROJECT_ID_DEV`
   - `*_PROJECT_ID_STAGING`
   - `*_PROJECT_ID_PROD`
3. **Feature flags**
   - `*_ENABLE_SERVICE_REQUESTS`
   - `*_ENABLE_ESCORT_OPTION`

### Env file naming conventions

- `*.env.example`: committed contract template (never secrets).
- `.env.local`: developer-specific values (gitignored).
- `.env.development`, `.env.staging`, `.env.production`: optional environment-specific files.
- `.env.*.local`: local overrides per environment (gitignored).

Recommended setup per app:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
cp firebase/.env.example firebase/.env.local
```

## Branch strategy and release channels

- `main`: production branch; only release-ready, validated changes.
- `develop`: default integration branch for ongoing work.
- `release/*` (optional): stabilization branches for planned production cuts, e.g. `release/2026.02`.

### Suggested flow

1. Create feature branches from `develop`.
2. Merge completed work into `develop`.
3. Cut `release/*` from `develop` when preparing a release.
4. Promote release branch to `main` for production.
5. Back-merge `main` and/or release fixes into `develop`.

## What is implemented now

A runnable MVP web experience lives under `web/` with:
- Category browsing for Cook/Care/DIY/Family
- Content feed with filter by category/subcategory
- Save content flow
- Continue watching/progress tracking flow
- Service request submission + request note updates
- Admin utility page to seed and review content (mock mode)
- Protected admin dashboard scaffold at `apps/admin` with claim/backend-gated access, content CRUD, taxonomy management, and media upload pathing for `content/{contentId}/...`

## Run locally

From repo root:

```bash
python -m http.server 4173
```

Then open:
- User app: `http://localhost:4173/web/`
- Admin app: `http://localhost:4173/web/admin.html`
- New protected admin dashboard: `http://localhost:4173/apps/admin/`

## Data mode

`web/js/config.js` uses `USE_MOCK_DATA: true` so the MVP runs without backend setup.

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



## Firebase multi-environment configuration

This repo is configured for three Firebase environments in `.firebaserc`:
- `dev` -> `home-app-dev`
- `staging` -> `home-app-staging`
- `prod` -> `home-app-prod`

`firebase.json` now includes deploy targets for:
- Firestore rules + indexes (`target: app`)
- Storage rules (`target: app`)
- Hosting (`target: web`, `target: admin`)
- Functions (`codebase: default`, source: `functions/`)

Example deploy commands:

```bash
firebase use dev
firebase deploy --only firestore:app,storage:app,hosting:web,hosting:admin,functions

firebase use staging
firebase deploy --only firestore:app,storage:app,hosting:web,hosting:admin,functions

firebase use prod
firebase deploy --only firestore:app,storage:app,hosting:web,hosting:admin,functions
```

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
