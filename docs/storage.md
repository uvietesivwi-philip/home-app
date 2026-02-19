# Cloud Storage schema and access model

## Path schema

This project reserves two Storage namespaces:

- `content/{contentId}/...` for admin-uploaded media used by the product.
- `users/{uid}/...` as an optional namespace for user assets if/when user uploads are introduced.

Anything outside these prefixes is denied by default.

## Security rules summary

Rules are defined in `firebase/storage.rules` with these controls:

1. **Authenticated reads** for approved namespaces (`content/*` and `users/*`) to satisfy the current product requirement.
2. **Admin-only writes** for `content/{contentId}/...` to keep product media ingestion restricted.
3. **Approved write paths only** for `users/{uid}/...` (admins or trusted backend service identities only).
4. **Global deny fallback** (`/{allPaths=**}`) to prevent unsafe wildcard writes in unapproved paths.

## Admin-only media upload flow

Use this flow for product media (`content/{contentId}/...`):

1. Admin signs in through the admin surface and receives custom claim `admin == true`.
2. Admin uploads media to Storage path `content/{contentId}/{filename}`.
3. Upload metadata (download reference, MIME type, dimensions/duration if needed) is written to Firestore `content/{contentId}` by trusted admin/backend code.
4. Client apps read the Firestore metadata and fetch the media object when authenticated.

Recommended operational guardrails:

- Keep upload keys deterministic (e.g., `cover.jpg`, `trailer.mp4`) or versioned (`cover_v2.jpg`) to simplify invalidation.
- Validate content type and max size in backend or upload workflow.
- Keep `contentId` aligned with Firestore document IDs for traceability.

## Signed URL vs reference strategy

Prefer **Storage path references** in Firestore for normal app reads, for example:

- `content/{contentId}/cover.jpg`
- `content/{contentId}/audio/main.mp3`

Why:

- Signed URLs can expire and create churn in persisted metadata.
- Path references stay stable; clients resolve to download URLs at runtime while authenticated.

Use **short-lived signed URLs** only when needed, such as:

- temporary cross-system sharing
- controlled external access outside authenticated app sessions
- backend-to-third-party transfer workflows

If signed URLs are used, generate them server-side and avoid storing long-lived signed URLs in Firestore.
