# Live hosting guide

This repo is now configured for Firebase Hosting with Firestore rules/index deployment.

## Option A (recommended): Firebase Hosting

### 1) Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2) Login
```bash
firebase login
```

### 3) Set your Firebase project ID
```bash
cp .firebaserc.example .firebaserc
```
Edit `.firebaserc` and replace `your-firebase-project-id`.

### 4) Deploy Hosting only (fastest way to go live)
```bash
firebase deploy --only hosting
```

### 5) Deploy Firestore security artifacts (when backend is connected)
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 6) Get your live URL
After deploy, Firebase prints URLs like:
- `https://<project-id>.web.app`
- `https://<project-id>.firebaseapp.com`

---

## Option B: Vercel / Netlify static hosting

Because the app is static (`web/`), you can host on Vercel or Netlify by setting the publish directory to:
- `web`

If you use Vercel/Netlify and still use Firebase Firestore, keep `firestore.rules`/`firestore.indexes.json` deployed with Firebase CLI as shown above.

---

## Connect to production Firebase backend

The app currently runs in mock mode.

1. Open `web/js/config.js`
2. Set `USE_MOCK_DATA` to `false`
3. Fill Firebase config values (`apiKey`, `authDomain`, `projectId`, `appId`)
4. Replace mock data methods in `web/js/store.js` with Firebase SDK calls aligned to:
   - `FIRESTORE_SCREEN_QUERIES.md`
   - `firestore.rules`

---

## Production checklist

- Hosting deployed and reachable via HTTPS
- Firestore rules deployed
- Firestore indexes built (READY)
- Auth providers enabled in Firebase Console
- `USE_MOCK_DATA` disabled for production builds
- Real environment config injected before deploy
