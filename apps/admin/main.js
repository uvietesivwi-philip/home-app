import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getIdTokenResult
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const firebaseConfig = window.__FIREBASE_CONFIG__ || {
  apiKey: 'replace-me',
  authDomain: 'replace-me',
  projectId: 'replace-me',
  storageBucket: 'replace-me',
  appId: 'replace-me'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const ui = {
  authCard: document.getElementById('authCard'),
  authStatus: document.getElementById('authStatus'),
  taxonomyCard: document.getElementById('taxonomyCard'),
  taxonomyForm: document.getElementById('taxonomyForm'),
  taxonomyPreview: document.getElementById('taxonomyPreview'),
  contentCard: document.getElementById('contentCard'),
  contentForm: document.getElementById('contentForm'),
  contentStatus: document.getElementById('contentStatus'),
  contentList: document.getElementById('contentList'),
  resetBtn: document.getElementById('resetBtn')
};

function setProtectedVisible(isVisible) {
  ui.taxonomyCard.classList.toggle('hidden', !isVisible);
  ui.contentCard.classList.toggle('hidden', !isVisible);
}

async function secureBackendGate() {
  try {
    const res = await fetch('/api/admin/session', { credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

async function isAdmin(user) {
  if (!user) return false;
  const token = await getIdTokenResult(user, true);
  if (token.claims.admin === true) return true;
  if (Array.isArray(token.claims.roles) && token.claims.roles.includes('admin')) return true;
  return secureBackendGate();
}

function nowIso() {
  return new Date().toISOString();
}

async function upsertTaxonomyOption({ category, subcategory, type }) {
  const refDoc = doc(db, 'taxonomy', 'options');
  const snap = await getDoc(refDoc);
  const rows = snap.exists() ? snap.data().rows || [] : [];
  const exists = rows.find((r) => r.category === category && r.subcategory === subcategory && r.type === type);
  if (!exists) {
    rows.push({ category, subcategory, type });
  }
  await setDoc(refDoc, { rows, updatedAt: serverTimestamp() }, { merge: true });
}

async function uploadMedia(contentId, file) {
  if (!file) return null;
  const mediaRef = ref(storage, `content/${contentId}/${Date.now()}-${file.name}`);
  await uploadBytes(mediaRef, file);
  return getDownloadURL(mediaRef);
}

async function saveContent(formData) {
  const id = formData.get('id') || crypto.randomUUID();
  const mediaFile = formData.get('media');
  const createdAtValue = formData.get('id') ? undefined : serverTimestamp();

  const payload = {
    title: formData.get('title'),
    summary: formData.get('summary'),
    category: formData.get('category'),
    subcategory: formData.get('subcategory'),
    type: formData.get('type'),
    status: formData.get('status'),
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso()
  };

  if (createdAtValue) {
    payload.createdAt = createdAtValue;
    payload.createdAtIso = nowIso();
  }

  const mediaUrl = await uploadMedia(id, mediaFile && mediaFile.size ? mediaFile : null);
  if (mediaUrl) payload.mediaUrl = mediaUrl;

  await setDoc(doc(db, 'content', id), payload, { merge: true });
}

async function setPublishState(id, publish) {
  await updateDoc(doc(db, 'content', id), {
    status: publish ? 'published' : 'draft',
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso()
  });
}

function fillFormFromContent(row) {
  const form = ui.contentForm;
  form.id.value = row.id;
  form.title.value = row.title || '';
  form.summary.value = row.summary || '';
  form.category.value = row.category || '';
  form.subcategory.value = row.subcategory || '';
  form.type.value = row.type || '';
  form.status.value = row.status || 'draft';
}

function clearContentForm() {
  ui.contentForm.reset();
  ui.contentForm.id.value = '';
}

function renderContentRows(rows) {
  ui.contentList.innerHTML = '';
  rows.forEach((row) => {
    const item = document.createElement('article');
    item.className = 'row';
    item.innerHTML = `
      <h3>${row.title || '(untitled)'}</h3>
      <div class="meta">${row.category}/${row.subcategory} • ${row.type} • ${row.status || 'draft'}</div>
      <div class="meta">createdAt: ${row.createdAtIso || '-'} | updatedAt: ${row.updatedAtIso || '-'}</div>
      <div class="buttons">
        <button type="button" data-action="edit">Edit</button>
        <button type="button" data-action="publish">Publish</button>
        <button type="button" data-action="unpublish">Unpublish</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
    `;

    item.querySelector('[data-action="edit"]').addEventListener('click', () => fillFormFromContent(row));
    item.querySelector('[data-action="publish"]').addEventListener('click', async () => setPublishState(row.id, true));
    item.querySelector('[data-action="unpublish"]').addEventListener('click', async () => setPublishState(row.id, false));
    item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      await deleteDoc(doc(db, 'content', row.id));
    });

    ui.contentList.appendChild(item);
  });
}

ui.taxonomyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(ui.taxonomyForm);
  await upsertTaxonomyOption({
    category: formData.get('category').trim(),
    subcategory: formData.get('subcategory').trim(),
    type: formData.get('type').trim()
  });
  ui.taxonomyForm.reset();
});

ui.contentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  ui.contentStatus.textContent = 'Saving...';
  const formData = new FormData(ui.contentForm);
  await saveContent(formData);
  ui.contentStatus.textContent = 'Saved.';
  clearContentForm();
});

ui.resetBtn.addEventListener('click', clearContentForm);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    ui.authStatus.textContent = 'Sign in required.';
    const btn = document.createElement('button');
    btn.textContent = 'Sign in with Google';
    btn.addEventListener('click', async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    });
    ui.authCard.appendChild(btn);
    setProtectedVisible(false);
    return;
  }

  const admin = await isAdmin(user);
  if (!admin) {
    ui.authStatus.textContent = `Signed in as ${user.email || user.uid}, but missing admin role.`;
    setProtectedVisible(false);
    return;
  }

  ui.authStatus.textContent = `Authorized as ${user.email || user.uid}.`;
  setProtectedVisible(true);

  onSnapshot(doc(db, 'taxonomy', 'options'), (snap) => {
    const rows = snap.exists() ? snap.data().rows || [] : [];
    ui.taxonomyPreview.textContent = JSON.stringify(rows, null, 2);
  });

  const q = query(collection(db, 'content'), orderBy('updatedAt', 'desc'));
  onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderContentRows(rows);
  });
});
