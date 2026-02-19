import { APP_CONFIG } from './config.js';
import {
  COLLECTION_KEYS,
  ContentProgressRepository,
  ContentRepository,
  RequestRepository,
  SavedContentRepository,
  ensureCollectionsInitialized,
  getLS,
  setLS
} from './domain-repositories.js';

const USER = { uid: 'demo-user-1', name: 'Demo User' };

const contentRepository = new ContentRepository();
const savedContentRepository = new SavedContentRepository();
const contentProgressRepository = new ContentProgressRepository();
const requestRepository = new RequestRepository();

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
    if (!localStorage.getItem(LS_KEYS.content)) setLS(LS_KEYS.content, await loadDefaultContent());
    if (!localStorage.getItem(LS_KEYS.saved)) setLS(LS_KEYS.saved, []);
    if (!localStorage.getItem(LS_KEYS.progress)) setLS(LS_KEYS.progress, []);
    if (!localStorage.getItem(LS_KEYS.requests)) setLS(LS_KEYS.requests, []);
  },

  async listContent({ category, subcategory, type, limit = 6, page = 1 } = {}) {
    let rows = getLS(LS_KEYS.content);
    if (category && category !== 'all') rows = rows.filter((x) => x.category === category);
    if (subcategory && subcategory !== 'all') rows = rows.filter((x) => x.subcategory === subcategory);
    if (type && type !== 'all') rows = rows.filter((x) => x.type === type);

    rows = sortByNewest(rows);
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return {
      rows: paged,
      total: rows.length,
      page,
      limit,
      hasMore: start + limit < rows.length
    };
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
    const saved = await savedContentRepository.listByUser(userId);
    const content = await contentRepository.listContent();
    const contentById = Object.fromEntries(content.map((x) => [x.id, x]));
    return saved.map((x) => ({ ...x, content: contentById[x.contentId] })).filter((x) => x.content);
  },

  async saveContent({ userId, contentId }) {
    await savedContentRepository.save({ userId, contentId });
  },

  async addProgress({ userId, contentId, deltaSeconds }) {
    const existing = await contentProgressRepository.getByUserAndContent(userId, contentId);
    const nextProgress = (existing?.progressSeconds || 0) + deltaSeconds;
    await contentProgressRepository.upsertProgress({ userId, contentId, progressSeconds: nextProgress });
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
  }
};

export const __mockStorage = { getLS };
