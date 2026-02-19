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

function sortByDateDesc(rows, key) {
  return [...rows].sort((a, b) => new Date(b[key]) - new Date(a[key]));
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
    if (!localStorage.getItem(LS_KEYS.content)) setLS(LS_KEYS.content, await loadDefaultContent());
    if (!localStorage.getItem(LS_KEYS.saved)) setLS(LS_KEYS.saved, []);
    if (!localStorage.getItem(LS_KEYS.progress)) setLS(LS_KEYS.progress, []);
    if (!localStorage.getItem(LS_KEYS.requests)) setLS(LS_KEYS.requests, []);
  },

  async listContent({ category, subcategory } = {}) {
    let rows = getLS(LS_KEYS.content);
    if (category && category !== 'all') rows = rows.filter((x) => x.category === category);
    if (subcategory && subcategory !== 'all') rows = rows.filter((x) => x.subcategory === subcategory);
    return sortByDateDesc(rows, 'createdAt');
  },

  async getContentById(contentId) {
    if (!contentId) return null;
    return getLS(LS_KEYS.content).find((x) => x.id === contentId) || null;
  },

  async listSuggestedContent(limit = 2) {
    return sortByDateDesc(getLS(LS_KEYS.content), 'createdAt').slice(0, limit);
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

  async getLatestProgress(userId) {
    const rows = sortByDateDesc(
      getLS(LS_KEYS.progress).filter((x) => x.userId === userId),
      'updatedAt'
    ).slice(0, 1);
    return rows[0] || null;
  },

  async continueWatching(userId) {
    const progress = await this.getLatestProgress(userId);
    if (!progress) return { state: 'empty' };
    if (!progress.contentId || typeof progress.progressSeconds !== 'number') {
      return { state: 'stale', progress, content: null };
    }
    const content = await this.getContentById(progress.contentId);
    if (!content) return { state: 'deleted', progress, content: null };
    return { state: 'ready', progress, content };
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
    return sortByDateDesc(getLS(LS_KEYS.requests).filter((x) => x.userId === userId), 'createdAt');
  },

  async updateRequestNotes({ userId, requestId, notes, preferredTime }) {
    const requests = getLS(LS_KEYS.requests);
    const row = requests.find((x) => x.id === requestId && x.userId === userId);
    if (!row) return;
    row.notes = notes;
    row.preferredTime = preferredTime || row.preferredTime;
    setLS(LS_KEYS.requests, requests);
  },

  async seedDefaultContent() {
    setLS(LS_KEYS.content, await loadDefaultContent());
  }
};
