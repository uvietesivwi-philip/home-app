import { APP_CONFIG } from './config.js';

const DEMO_USER = { uid: 'demo-user-1', name: 'Demo User' };
const LS_KEYS = {
  user: 'hh_user',
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

export const authApi = {
  async signInDemo() {
    setLS(LS_KEYS.user, DEMO_USER);
    return DEMO_USER;
  },
  async signOut() {
    localStorage.removeItem(LS_KEYS.user);
  },
  getCurrentUser() {
    const raw = localStorage.getItem(LS_KEYS.user);
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

  async getContent(contentId) {
    return getLS(LS_KEYS.content).find((x) => x.id === contentId) || null;
  },

  async listSaved(userId) {
    const saved = getLS(LS_KEYS.saved).filter((x) => x.userId === userId);
    const contentById = Object.fromEntries(getLS(LS_KEYS.content).map((c) => [c.id, c]));
    return saved.map((s) => ({ ...s, content: contentById[s.contentId] })).filter((x) => x.content);
  },

  async saveContent({ userId, contentId }) {
    const saved = getLS(LS_KEYS.saved);
    const existing = saved.find((x) => x.userId === userId && x.contentId === contentId);
    if (!existing) {
      saved.push({
        id: `${userId}_${contentId}`,
        userId,
        contentId,
        savedAt: new Date().toISOString()
      });
      setLS(LS_KEYS.saved, saved);
    }
  },

  async addProgress({ userId, contentId, deltaSeconds }) {
    const progress = getLS(LS_KEYS.progress);
    const id = `${userId}_${contentId}`;
    const existing = progress.find((x) => x.id === id);

    if (existing) {
      existing.progressSeconds += deltaSeconds;
      existing.updatedAt = new Date().toISOString();
    } else {
      progress.push({
        id,
        userId,
        contentId,
        progressSeconds: deltaSeconds,
        updatedAt: new Date().toISOString()
      });
    }

    setLS(LS_KEYS.progress, progress);
  },

  async continueWatching(userId) {
    const latest = getLS(LS_KEYS.progress)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    if (!latest) return null;

    const content = await this.getContent(latest.contentId);
    return content ? { progress: latest, content } : null;
  },

  async createRequest({ userId, type, phone, location, notes, preferredTime }) {
    const requests = getLS(LS_KEYS.requests);
    requests.push({
      id: crypto.randomUUID(),
      userId,
      type,
      phone: phone || null,
      location: location || null,
      notes: notes || null,
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
  },

  async seedDefaultContent() {
    const content = await loadDefaultContent();
    setLS(LS_KEYS.content, content);
  }
};
