# Implementation Task List (Platform Rebuild)

This checklist converts the platform overview into executable engineering tasks. It is organized for phased delivery and ownership assignment.

## Phase 1: Foundation
- [ ] Create Firebase projects (`dev`, `staging`, `prod`) and map them in `.firebaserc`.
- [ ] Enable Firebase Auth, Firestore, Storage, Hosting in each environment.
- [ ] Define environment variable contract for web/mobile/admin clients.
- [ ] Add CI pipeline skeleton for lint, tests, and deploy jobs.

## Phase 2: Security and data contracts
- [ ] Finalize Firestore collection schemas: `users`, `content`, `savedContent`, `contentProgress`, `requests`.
- [ ] Keep ownership and immutable-field checks in Firestore rules.
- [ ] Verify all required composite indexes in `firestore.indexes.json`.
- [ ] Add Firestore Emulator tests for rules (owner-only access, deny cross-user access).

## Phase 3: Client data layer
- [ ] Implement typed repository layer for all Firestore operations.
- [ ] Implement auth state guard on all screens.
- [ ] Implement content listing by category/subcategory/type.
- [ ] Implement content detail fetch by ID.
- [ ] Implement save/unsave and saved-list retrieval.
- [ ] Implement progress upsert and continue-watching query.
- [ ] Implement request submission and user request history/update.

## Phase 4: Admin operations
- [ ] Build admin CMS for content CRUD and media upload.
- [ ] Restrict admin access via custom claims / trusted backend.
- [ ] Implement request operations queue and status transitions server-side.

## Phase 5: Compliance and launch readiness
- [ ] Implement age-gating strategy and policy-driven feature flags.
- [ ] Publish Privacy Policy and Terms in app surfaces.
- [ ] Integrate Crashlytics/Analytics/Performance monitoring.
- [ ] Enable Firestore PITR and backup export schedule.
- [ ] Finalize release checklist and rollback playbook.
