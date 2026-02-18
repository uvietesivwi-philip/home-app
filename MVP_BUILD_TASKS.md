# MVP build tasks (start-to-finish)

This is the execution checklist for turning the current planning artifacts into a shippable MVP.

Current assets already in repo:
- Firestore security rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Screen query contracts: `FIRESTORE_SCREEN_QUERIES.md`
- Immediate hardening checklist: `NEXT_STEPS.md`

---

## Phase 0 — Project setup (Day 0–1)

### 0.1 Environments and access
- [ ] Create Firebase projects: `dev`, `staging`, `prod`
- [ ] Enable Firestore + Authentication in all environments
- [ ] Configure environment variables for app clients (`apiKey`, `projectId`, etc.)
- [ ] Set up role ownership: who can deploy rules/indexes

### 0.2 Repo and CI baseline
- [ ] Add CI workflow with at least lint + test job placeholders
- [ ] Add branch protection for mainline branch
- [ ] Add deployment scripts for:
  - [ ] `firebase deploy --only firestore:rules`
  - [ ] `firebase deploy --only firestore:indexes`

**Deliverable:** Team can deploy infra artifacts repeatably.

---

## Phase 1 — Data model and contracts (Day 1–2)

### 1.1 Freeze collection schemas
- [ ] Document required fields/types for collections:
  - [ ] `users`
  - [ ] `content`
  - [ ] `savedContent`
  - [ ] `contentProgress`
  - [ ] `requests`
- [ ] Decide optional fields and defaults per collection
- [ ] Assign immutable fields (must never change after create)

### 1.2 Query-to-schema alignment
- [ ] Validate every query in `FIRESTORE_SCREEN_QUERIES.md` against schema
- [ ] Confirm indexes cover all compound query patterns
- [ ] Add missing indexes if any new filters/orderings are introduced

**Deliverable:** Stable backend contract frontend can build against.

---

## Phase 2 — Security verification (Day 2–4)

### 2.1 Firestore Emulator tests (highest priority)
- [ ] Add test project using `@firebase/rules-unit-testing`
- [ ] Add tests for unauthenticated denial across collections
- [ ] Add ownership tests (`user A` cannot access `user B` docs)
- [ ] Add tamper tests (immutable fields cannot be changed on update)
- [ ] Add allowed-path tests for expected user actions

### 2.2 Deploy and verify rules/indexes
- [ ] Deploy rules to `dev`
- [ ] Deploy indexes to `dev`
- [ ] Confirm indexes reach READY state
- [ ] Repeat on `staging` after test pass

**Deliverable:** Security is enforced and regression-tested.

---

## Phase 3 — Auth and identity (Day 3–5)

### 3.1 Authentication
- [ ] Implement signup/login (email/phone per product decision)
- [ ] Ensure all app screens require authenticated session
- [ ] Add logout + token refresh handling

### 3.2 User profile
- [ ] Implement create/read/update own profile at `/users/{uid}`
- [ ] Add client-side guards to avoid cross-user path access

**Deliverable:** Signed-in users can manage only their own profile.

---

## Phase 4 — Content experience MVP (Day 5–9)

### 4.1 Home screen
- [ ] Implement continue-watching query (`contentProgress` latest)
- [ ] Implement suggested content query (`content` latest)

### 4.2 Category experiences
- [ ] Cook: African/Continental lists
- [ ] Care: bathing/dressing/hairstyling lists
- [ ] DIY: guides list
- [ ] Family: parents activities + kids stories

### 4.3 Content detail actions
- [ ] Load single content item
- [ ] Save content to `savedContent`
- [ ] Persist progress in `contentProgress`

**Deliverable:** Users can browse and consume content across core categories.

---

## Phase 5 — Service request flow (Day 8–11)

### 5.1 Request creation
- [ ] Build form for service types (`maid`, `driver`, `escort`)
- [ ] Validate payload to match rules (`status: pending`, timestamps)
- [ ] Submit to `/requests`

### 5.2 Request management (user-side)
- [ ] Build “My requests” list
- [ ] Build request detail view
- [ ] Allow only editable field updates (e.g. `notes`, preferred schedule)
- [ ] Do not expose controls for immutable fields (`type`, `status`, ownership, `createdAt`)

**Deliverable:** End users can submit and track requests safely.

---

## Phase 6 — Admin operations path (Day 10–13)

### 6.1 Admin write channel
- [ ] Choose one approach:
  - [ ] Cloud Functions/Admin SDK only, or
  - [ ] Separate admin app with custom claims
- [ ] Implement `content` create/update/publish pipeline
- [ ] Add audit metadata (`updatedBy`, `updatedAt`)

### 6.2 Request operations
- [ ] Add admin queue for incoming requests
- [ ] Add status transition model handled in trusted backend
- [ ] Prevent client-side user apps from setting operational statuses

**Deliverable:** Non-client workflows exist for content and operations.

---

## Phase 7 — Quality, compliance, and release (Day 12–15)

### 7.1 QA and observability
- [ ] Add smoke tests for top 10 user flows
- [ ] Add crash/error logging
- [ ] Add analytics events for core funnels

### 7.2 Policy and store readiness
- [ ] Privacy Policy + Terms URLs live
- [ ] Data retention rules documented (especially `requests`)
- [ ] Kids-content handling reviewed for store compliance
- [ ] Support contact and escalation path documented

### 7.3 Go-live checklist
- [ ] Rules and indexes deployed to production
- [ ] Emulator tests passing in CI
- [ ] Rollback plan documented
- [ ] Pilot cohort selected and monitored

**Deliverable:** MVP is launchable with operational safeguards.

---

## Critical path (if you need to move fast)

1. Firestore emulator tests for rules
2. Auth + profile
3. Content browse/detail flows
4. Service request submit/track
5. Admin content + request operations
6. Staging hardening + production release

---

## Definition of Done (MVP)

- [ ] All planned user queries run successfully under deployed rules
- [ ] No user can read/write another user’s private documents
- [ ] `content` remains client read-only
- [ ] Request flow works end-to-end for all three service types
- [ ] Admin can publish content and process requests
- [ ] Security tests are automated and passing in CI
