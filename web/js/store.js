import { APP_CONFIG } from './config.js';

const USER = { uid: 'demo-user-1', name: 'Demo User' };
const LS_KEYS = {
  content: 'hh_content',
  saved: 'hh_saved',
  progress: 'hh_progress',
  requests: 'hh_requests'
};

async function loadDefaultContent() {
  const res = await fetch('./data/default-content.json');
  return res.json();
}

function getLS(key, fallback = []) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function resolveStorageUrl(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;
  const path = inputPath.trim();
  if (!path) return null;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('gs://')) {
    const bucket = APP_CONFIG.FIREBASE.storageBucket;
    if (!bucket) return null;
    const withoutScheme = path.replace(/^gs:\/\//, '');
    const objectPath = withoutScheme.includes('/') ? withoutScheme.split('/').slice(1).join('/') : '';
    if (!objectPath) return null;
    return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}?alt=media`;
  }

  if (path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }

  if (path.startsWith('./') || path.startsWith('../')) {
    return new URL(path, window.location.href).toString();
  }

  return null;
}

export const authApi = {
  async signInDemo() {
    localStorage.setItem('hh_user', JSON.stringify(USER));
    return USER;
  },
  async signOut() {
    localStorage.removeItem('hh_user');
  },
  getCurrentUser() {
    const raw = localStorage.getItem('hh_user');
    return raw ? JSON.parse(raw) : null;
  }
};

export const dataApi = {
  async bootstrap() {
    if (!APP_CONFIG.USE_MOCK_DATA) {
      throw new Error('Firebase mode is not wired in this repository yet.');
    }
    if (!localStorage.getItem(LS_KEYS.content)) {
      setLS(LS_KEYS.content, await loadDefaultContent());
    }
    if (!localStorage.getItem(LS_KEYS.saved)) setLS(LS_KEYS.saved, []);
    if (!localStorage.getItem(LS_KEYS.progress)) setLS(LS_KEYS.progress, []);
    if (!localStorage.getItem(LS_KEYS.requests)) setLS(LS_KEYS.requests, []);
  },

  async listContent({ category, subcategory } = {}) {
    let rows = getLS(LS_KEYS.content);
    if (category && category !== 'all') rows = rows.filter((x) => x.category === category);
    if (subcategory && subcategory !== 'all') rows = rows.filter((x) => x.subcategory === subcategory);
    return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getContentById({ contentId, userId }) {
    const row = getLS(LS_KEYS.content).find((x) => x.id === contentId);
    if (!row) throw normalizeError('not-found', `content/${contentId} does not exist.`);
    if (row.requiresAuth && !userId) {
      throw normalizeError('permission-denied', 'Sign in required to view this content.');
    }

    return {
      ...row,
      resolvedMediaUrl: resolveStorageUrl(row.mediaPath || row.bgVideo || row.coverImage)
    };
  },

  async listSaved(userId) {
    const saved = getLS(LS_KEYS.saved).filter((x) => x.userId === userId);
    const contentById = Object.fromEntries(getLS(LS_KEYS.content).map((c) => [c.id, c]));
    return saved.map((s) => ({ ...s, content: contentById[s.contentId] })).filter((x) => x.content);
  },

  async saveContent({ userId, contentId }) {
    const saved = getLS(LS_KEYS.saved);
    if (!saved.find((x) => x.userId === userId && x.contentId === contentId)) {
      saved.push({ id: crypto.randomUUID(), userId, contentId, savedAt: new Date().toISOString() });
      setLS(LS_KEYS.saved, saved);
    }
  },

  async addProgress({ userId, contentId, deltaSeconds }) {
    const progress = getLS(LS_KEYS.progress);
    const existing = progress.find((x) => x.userId === userId && x.contentId === contentId);
    if (existing) {
      existing.progressSeconds += deltaSeconds;
      existing.updatedAt = new Date().toISOString();
    } else {
      progress.push({
        id: crypto.randomUUID(),
        userId,
        contentId,
        progressSeconds: deltaSeconds,
        updatedAt: new Date().toISOString()
      });
    }
    setLS(LS_KEYS.progress, progress);
  },

  async continueWatching(userId) {
    const progress = getLS(LS_KEYS.progress)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!progress.length) return null;
    const content = getLS(LS_KEYS.content).find((x) => x.id === progress[0].contentId);
    return content ? { progress: progress[0], content } : null;
  },

  async createRequest({ userId, type, phone, location, notes, preferredTime }) {
    const requests = getLS(LS_KEYS.requests);
    requests.push({
      id: crypto.randomUUID(),
      userId,
      type,
      phone: phone || null,
      location: location || null,
      notes,
      preferredTime: preferredTime || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    setLS(LS_KEYS.requests, requests);
  },

  async listRequests(userId) {
    return getLS(LS_KEYS.requests)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async updateRequestNotes({ userId, requestId, notes, preferredTime }) {
    const requests = getLS(LS_KEYS.requests);
    const row = requests.find((x) => x.id === requestId && x.userId === userId);
    if (!row) return;
    row.notes = notes;
    row.preferredTime = preferredTime || row.preferredTime;
    setLS(LS_KEYS.requests, requests);
  }
};
