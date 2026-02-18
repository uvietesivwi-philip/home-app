# What’s next after MVP Firestore setup

Now that baseline rules, indexes, and query mapping are in place, the next step is to make implementation safe, testable, and launch-ready.

## 1) Implement Firestore Emulator security tests (first)

Create automated tests for rules so changes never silently weaken security.

### Must-pass test cases
- Unauthenticated user cannot read/write any collection.
- User A cannot read/write User B profile.
- `content` is readable when signed in, never writable by clients.
- `savedContent` create requires `userId == auth.uid`.
- `savedContent` update cannot change `userId` or `contentId`.
- `contentProgress` update cannot change `userId` or `contentId`.
- `requests` create allows only `maid|driver|escort` and `status=pending`.
- `requests` update cannot change `userId`, `type`, `createdAt`, or `status`.

## 2) Lock app writes to match rules

Make sure client code only writes fields allowed by rules.

### Client write contracts
- `savedContent` create payload: `{ userId, contentId, savedAt }`
- `contentProgress` create/update payload: `{ userId, contentId, progressSeconds, updatedAt }`
- `requests` create payload: `{ userId, type, notes, status: "pending", createdAt }`
- `requests` update should only change editable user fields (e.g. `notes`, schedule metadata), not ownership/status/type.

## 3) Add admin path for content operations

Current rules intentionally block all client writes to `content`.
Use either:
- trusted backend (Cloud Functions/Admin SDK), or
- separate admin app with custom claims (`admin == true`) and explicit admin rules.

## 4) Define data retention and moderation policy

Before pilot launch, define:
- retention period for `requests`
- abuse/moderation process for user-entered `notes`
- incident response owner for account/report issues

## 5) Prepare release checklist

- Rules deployed to target Firebase project
- Indexes fully built (no pending state)
- Emulator tests green in CI
- App Store privacy labels aligned with collected fields
- Support contact + Terms/Privacy linked in app
