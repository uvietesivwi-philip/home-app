# home-app

MVP planning artifacts for the Home Help app.

## Included in this repository
- `ChatGPT - App Development Diagram.pdf`: source planning diagram and notes.
- `firestore.rules`: production Firestore access controls for MVP data surfaces.
- `firestore.indexes.json`: composite indexes required by MVP query patterns.
- `FIRESTORE_SCREEN_QUERIES.md`: exact Firestore query mapping per app screen.

## MVP collections
- `users`
- `content`
- `savedContent`
- `contentProgress`
- `requests`

## Deploy notes
1. Enable Firebase Authentication.
2. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Next execution step
See `NEXT_STEPS.md` for the immediate implementation checklist (emulator rule tests, client write contracts, admin path, compliance/release readiness).
