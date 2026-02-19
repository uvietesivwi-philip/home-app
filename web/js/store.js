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

function createJsonStorage(storage) {
  return {
    get(key, fallback = []) {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    },
    set(key, value) {
      storage.setItem(key, JSON.stringify(value));
    },
    has(key) {
      return storage.getItem(key) !== null;
    }
  };
}

export function createLocalDataRepository({
  storage = createJsonStorage(localStorage),
  contentLoader = loadDefaultContent,
  uuid = () => crypto.randomUUID(),
  now = () => new Date().toISOString()
} = {}) {
  return {
    async bootstrap() {
      if (!APP_CONFIG.USE_MOCK_DATA) {
        throw new Error('Firebase mode is not wired in this repository yet.');
      }
      if (!storage.has(LS_KEYS.content)) {
        storage.set(LS_KEYS.content, await contentLoader());
      }
      if (!storage.has(LS_KEYS.saved)) storage.set(LS_KEYS.saved, []);
      if (!storage.has(LS_KEYS.progress)) storage.set(LS_KEYS.progress, []);
      if (!storage.has(LS_KEYS.requests)) storage.set(LS_KEYS.requests, []);
    },

    async listContent({ category, subcategory } = {}) {
      let rows = storage.get(LS_KEYS.content);
      if (category && category !== 'all') rows = rows.filter((x) => x.category === category);
      if (subcategory && subcategory !== 'all') rows = rows.filter((x) => x.subcategory === subcategory);
      return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async listSaved(userId) {
      const saved = storage.get(LS_KEYS.saved).filter((x) => x.userId === userId);
      const contentById = Object.fromEntries(storage.get(LS_KEYS.content).map((c) => [c.id, c]));
      return saved.map((s) => ({ ...s, content: contentById[s.contentId] })).filter((x) => x.content);
    },

    async saveContent({ userId, contentId }) {
      const saved = storage.get(LS_KEYS.saved);
      if (!saved.find((x) => x.userId === userId && x.contentId === contentId)) {
        saved.push({ id: uuid(), userId, contentId, savedAt: now() });
        storage.set(LS_KEYS.saved, saved);
      }
    },

    async addProgress({ userId, contentId, deltaSeconds }) {
      const progress = storage.get(LS_KEYS.progress);
      const existing = progress.find((x) => x.userId === userId && x.contentId === contentId);
      if (existing) {
        existing.progressSeconds += deltaSeconds;
        existing.updatedAt = now();
      } else {
        progress.push({
          id: uuid(),
          userId,
          contentId,
          progressSeconds: deltaSeconds,
          updatedAt: now()
        });
      }
      storage.set(LS_KEYS.progress, progress);
    },

    async continueWatching(userId) {
      const progress = storage
        .get(LS_KEYS.progress)
        .filter((x) => x.userId === userId)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      if (!progress.length) return null;
      const content = storage.get(LS_KEYS.content).find((x) => x.id === progress[0].contentId);
      return content ? { progress: progress[0], content } : null;
    },

    async createRequest({ userId, type, phone, location, notes, preferredTime }) {
      const requests = storage.get(LS_KEYS.requests);
      requests.push({
        id: uuid(),
        userId,
        type,
        phone: phone || null,
        location: location || null,
        notes,
        preferredTime: preferredTime || null,
        status: 'pending',
        createdAt: now()
      });
      storage.set(LS_KEYS.requests, requests);
    },

    async listRequests(userId) {
      return storage
        .get(LS_KEYS.requests)
        .filter((x) => x.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async updateRequestNotes({ userId, requestId, notes, preferredTime }) {
      const requests = storage.get(LS_KEYS.requests);
      const row = requests.find((x) => x.id === requestId && x.userId === userId);
      if (!row) return;
      row.notes = notes;
      row.preferredTime = preferredTime || row.preferredTime;
      storage.set(LS_KEYS.requests, requests);
    },

    async seedDefaultContent() {
      storage.set(LS_KEYS.content, await contentLoader());
    }
  };
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

export const dataApi = createLocalDataRepository();
