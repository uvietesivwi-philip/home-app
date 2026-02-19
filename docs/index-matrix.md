# Firestore index matrix by UI query

This matrix maps each screen-level Firestore query to the composite index entry required in `firebase/firestore.indexes.json`.

## Legend
- **Auto**: supported by Firestore single-field indexing (no composite index required).
- **Composite**: requires an explicit entry in `firestore.indexes.json`.

## Query-to-index mapping

| Screen / UI flow | Firestore query pattern | Required index |
|---|---|---|
| Home → Continue watching | `contentProgress` filtered by `userId == ?` and ordered by `updatedAt desc` (`limit(1)`) | **Composite**: `contentProgress(userId ASC, updatedAt DESC)` |
| Home → Suggested content | `content` ordered by `createdAt desc` (`limit(2)`) | **Auto** (`createdAt` single-field order) |
| Category feed (all categories, no subcategory selected) | `content` filtered by `category == ?` and ordered by `createdAt desc` | **Composite**: `content(category ASC, createdAt DESC)` |
| Cook/Care lists (subcategory tabs) | `content` filtered by `category == ?` + `subcategory == ?`, ordered by `createdAt desc` | **Composite**: `content(category ASC, subcategory ASC, createdAt DESC)` |
| Family lists (parents activities / kids stories) | `content` filtered by `category == ?` + `type == ?`, ordered by `createdAt desc` | **Composite**: `content(category ASC, type ASC, createdAt DESC)` |
| Services → My requests list | `requests` filtered by `userId == ?` and ordered by `createdAt desc` | **Composite**: `requests(userId ASC, createdAt DESC)` |
| Saved content list | `savedContent` filtered by `userId == ?` and ordered by `savedAt desc` | **Composite**: `savedContent(userId ASC, savedAt DESC)` |
| Content details lookup | `getDoc(content/{contentId})` | **Auto** (document key lookup) |

## Notes
- A non-ordered equality-only filter such as `where("category","==", ... )` can run without a composite index, but screens that show newest-first results should pair it with `orderBy("createdAt", "desc")` and use the listed composite entry.
- If future UI adds `where("difficulty","==", ... )` together with `orderBy("createdAt", "desc")`, add a matching composite index (e.g., `category + difficulty + createdAt`).
