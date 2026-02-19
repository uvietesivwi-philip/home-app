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

function getProgressDocId(userId, contentId) {
  return `${userId}_${contentId}`;
}

function writeProgress({ userId, contentId, progressSeconds, allowRestart = false }) {
  const progress = getLS(LS_KEYS.progress);
  const id = getProgressDocId(userId, contentId);
  const nowIso = new Date().toISOString();
  const normalizedProgress = Math.max(0, Math.floor(progressSeconds || 0));
  const index = progress.findIndex((row) => row.id === id || (row.userId === userId && row.contentId === contentId));

  if (index >= 0) {
    const existing = progress[index];
    const nextProgress = normalizedProgress;

    if (!allowRestart && nextProgress < existing.progressSeconds) {
      return { persisted: false, reason: 'regression_blocked', row: existing };
    }

    progress[index] = {
      id,
      userId,
      contentId,
      progressSeconds: nextProgress,
      updatedAt: nowIso
    };
    setLS(LS_KEYS.progress, progress);
    return { persisted: true, reason: 'updated', row: progress[index] };
  }

  const row = {
    id,
    userId,
    contentId,
    progressSeconds: normalizedProgress,
    updatedAt: nowIso
  };
  progress.push(row);
  setLS(LS_KEYS.progress, progress);
  return { persisted: true, reason: 'created', row };
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
    const id = getProgressDocId(userId, contentId);
    const existing = progress.find((x) => x.id === id || (x.userId === userId && x.contentId === contentId));
    const base = existing ? existing.progressSeconds : 0;
    return writeProgress({
      userId,
      contentId,
      progressSeconds: base + Math.max(0, Math.floor(deltaSeconds || 0))
    });
  },

  async setProgress({ userId, contentId, progressSeconds, allowRestart = false }) {
    return writeProgress({ userId, contentId, progressSeconds, allowRestart });
  },

  createProgressUpdater({ userId, contentId, getProgressSeconds, intervalSeconds = 15, allowRestart = false }) {
    let timer = null;
    let lastWrittenProgress = null;

    const flush = ({ force = false, restart = false } = {}) => {
      const current = Math.max(0, Math.floor(getProgressSeconds() || 0));
      if (!force && lastWrittenProgress !== null && current === lastWrittenProgress) return;
      const result = writeProgress({
        userId,
        contentId,
        progressSeconds: current,
        allowRestart: restart || allowRestart
      });
      if (result.persisted) lastWrittenProgress = result.row.progressSeconds;
    };

    const onVisibilityChange = () => {
      if (document.hidden) flush({ force: true });
    };

    const onPageExit = () => {
      flush({ force: true });
    };

    return {
      start() {
        if (!timer) {
          timer = window.setInterval(() => flush(), Math.max(1, intervalSeconds) * 1000);
        }
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pagehide', onPageExit);
        window.addEventListener('beforeunload', onPageExit);
      },
      pause() {
        flush({ force: true });
      },
      flush,
      restart() {
        flush({ force: true, restart: true });
      },
      stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        flush({ force: true });
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageExit);
        window.removeEventListener('beforeunload', onPageExit);
      }
    };
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
  },

  async seedDefaultContent() {
    const content = await loadDefaultContent();
    setLS(LS_KEYS.content, content);
  }
};
