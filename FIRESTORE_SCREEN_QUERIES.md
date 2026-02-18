# Firestore screen query map (MVP)

This document maps each app screen to exact Firestore query patterns aligned with the MVP information architecture.

## Assumptions
- Firebase Authentication is required for app access.
- Firestore security rules in `firestore.rules` are deployed.
- `content` documents are managed by admin tooling only.

## Home screen

### Continue watching / reading
```ts
query(
  collection(db, "contentProgress"),
  where("userId", "==", currentUser.uid),
  orderBy("updatedAt", "desc"),
  limit(1)
)
```
Then load the referenced content item:
```ts
getDoc(doc(db, "content", contentId))
```

### Suggested content
```ts
query(
  collection(db, "content"),
  orderBy("createdAt", "desc"),
  limit(2)
)
```

## Cook

### African list
```ts
query(
  collection(db, "content"),
  where("category", "==", "cook"),
  where("subcategory", "==", "african")
)
```

### Continental list
```ts
query(
  collection(db, "content"),
  where("category", "==", "cook"),
  where("subcategory", "==", "continental")
)
```

## Care

### Bathing / dressing / hairstyling list
```ts
query(
  collection(db, "content"),
  where("category", "==", "care"),
  where("subcategory", "==", "bathing") // or dressing / hairstyling
)
```

## DIY

### Guides list
```ts
query(
  collection(db, "content"),
  where("category", "==", "diy")
)
```
Optional later filter:
```ts
where("difficulty", "==", "easy")
```

## Family

### Parents activities
```ts
query(
  collection(db, "content"),
  where("category", "==", "family"),
  where("type", "==", "activity")
)
```

### Kids stories
```ts
query(
  collection(db, "content"),
  where("category", "==", "family"),
  where("type", "==", "story")
)
```

## Content detail screen (cook/care/diy)

### Load content
```ts
getDoc(doc(db, "content", contentId))
```

### Save content
```ts
addDoc(collection(db, "savedContent"), {
  userId: currentUser.uid,
  contentId,
  savedAt: serverTimestamp()
})
```

### Save progress
```ts
setDoc(doc(db, "contentProgress", progressId), {
  userId: currentUser.uid,
  contentId,
  progressSeconds: currentTime,
  updatedAt: serverTimestamp()
})
```

## Services

### Submit request (maid/driver/escort)
```ts
addDoc(collection(db, "requests"), {
  userId: currentUser.uid,
  type: "maid", // or driver / escort
  notes: userInput,
  status: "pending",
  createdAt: serverTimestamp()
})
```

## Saved content screen
```ts
query(
  collection(db, "savedContent"),
  where("userId", "==", currentUser.uid)
)
```
Then resolve each `contentId` with a content document lookup.
