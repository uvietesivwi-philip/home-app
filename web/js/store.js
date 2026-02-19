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

function canUserEditRequest(request, updates) {
  const allowedKeys = ['notes', 'cancelRequested'];
  return Object.keys(updates).every((key) => allowedKeys.includes(key)) && request.status === 'pending';
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

  async createRequest({ userId, type, notes }) {
    const requests = getLS(LS_KEYS.requests);
    requests.push({
      id: crypto.randomUUID(),
      userId,
      type,
      notes: notes || '',
      cancelRequested: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setLS(LS_KEYS.requests, requests);
  },

  async listRequests(userId) {
    return getLS(LS_KEYS.requests)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async updateRequestByUser({ userId, requestId, notes, cancelRequested }) {
    const requests = getLS(LS_KEYS.requests);
    const row = requests.find((x) => x.id === requestId && x.userId === userId);
    if (!row) return { ok: false, reason: 'not_found' };

    const updates = {};
    if (typeof notes === 'string') updates.notes = notes;
    if (typeof cancelRequested === 'boolean') updates.cancelRequested = cancelRequested;

    if (!canUserEditRequest(row, updates)) {
      return { ok: false, reason: 'forbidden_fields_or_state' };
    }

    Object.assign(row, updates, { updatedAt: new Date().toISOString() });
    setLS(LS_KEYS.requests, requests);
    return { ok: true };
  },

  async seedDefaultContent() {
    const content = await loadDefaultContent();
    setLS(LS_KEYS.content, content);
  }
};
