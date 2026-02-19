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

const USER = {
  uid: 'demo-user-1',
  name: 'Demo User',
  email: 'demo.user@homehelp.test'
};

const LS_KEYS = {
  user: 'hh_user',
  users: 'hh_users',
  content: 'hh_content',
  saved: 'hh_saved',
  progress: 'hh_progress',
  requests: 'hh_requests',
  privacy: 'hh_privacy_requests'
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

function nowIso() {
  return new Date().toISOString();
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function batchFetchContentByIds(ids) {
  if (!ids.length) return [];
  const content = getLS(LS_KEYS.content);
  const batches = chunk(ids, 10);
  return batches.flatMap((batch) => content.filter((row) => batch.includes(row.id)));
}

export const authApi = {
  async signInDemo() {
    localStorage.setItem(LS_KEYS.user, JSON.stringify(USER));
    return USER;
  },
  async signOut() {
    localStorage.removeItem(LS_KEYS.user);
  },
  getCurrentUser() {
    const raw = localStorage.getItem(LS_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  },
  getCurrentClaims() {
    const raw = localStorage.getItem(LS_KEYS.claims);
    return raw ? JSON.parse(raw) : null;
  },
  hasAdminClaim() {
    return Boolean(authApi.getCurrentClaims()?.admin);
  }
};

export const dataApi = {
  async bootstrap() {
    if (!APP_CONFIG.USE_MOCK_DATA) {
      throw new Error('Firebase mode is not wired in this repository yet.');
    }

    if (!localStorage.getItem(LS_KEYS.users)) {
      setLS(LS_KEYS.users, [
        {
          uid: USER.uid,
          fullName: USER.name,
          email: USER.email,
          plan: 'premium-mvp',
          locale: 'en-NG',
          marketingConsent: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          status: 'active'
        }
      ]);
    }

    if (!localStorage.getItem(LS_KEYS.content)) setLS(LS_KEYS.content, await loadDefaultContent());
    if (!localStorage.getItem(LS_KEYS.saved)) setLS(LS_KEYS.saved, []);
    if (!localStorage.getItem(LS_KEYS.progress)) setLS(LS_KEYS.progress, []);
    if (!localStorage.getItem(LS_KEYS.requests)) setLS(LS_KEYS.requests, []);
    if (!localStorage.getItem(LS_KEYS.privacy)) setLS(LS_KEYS.privacy, []);
  },

  async getUserProfile(uid) {
    return getLS(LS_KEYS.users).find((row) => row.uid === uid) || null;
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
    const savedDocs = getLS(LS_KEYS.saved)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    const contentIds = [...new Set(savedDocs.map((doc) => doc.contentId))];
    const contentDocs = await batchFetchContentByIds(contentIds);
    const contentById = Object.fromEntries(contentDocs.map((doc) => [doc.id, doc]));

    return savedDocs.map((savedDoc) => {
      const content = contentById[savedDoc.contentId] || null;
      return {
        ...savedDoc,
        content,
        isOrphaned: !content
      };
    });
  },

  async saveContent({ userId, contentId }) {
    const authenticatedUserId = assertAuthenticatedUser(userId);
    const savedId = buildSavedId(authenticatedUserId, contentId);
    const saved = getLS(LS_KEYS.saved);
    if (!saved.find((x) => x.userId === userId && x.contentId === contentId)) {
      saved.push({ id: crypto.randomUUID(), userId, contentId, savedAt: nowIso() });
      setLS(LS_KEYS.saved, saved);
    }

    const record = {
      id: savedId,
      userId: authenticatedUserId,
      contentId,
      savedAt: new Date().toISOString()
    };
    saved.push(record);
    setLS(LS_KEYS.saved, saved);
    return record;
  },

  async unsaveContent({ userId, contentId }) {
    const authenticatedUserId = assertAuthenticatedUser(userId);
    const savedId = buildSavedId(authenticatedUserId, contentId);
    const saved = getLS(LS_KEYS.saved);

    const filtered = saved.filter((x) => !(x.id === savedId || (x.userId === authenticatedUserId && x.contentId === contentId)));
    if (filtered.length !== saved.length) {
      setLS(LS_KEYS.saved, filtered);
      return true;
    }
    return false;
  },

  async removeSaved({ userId, savedId }) {
    const saved = getLS(LS_KEYS.saved).filter((row) => !(row.id === savedId && row.userId === userId));
    setLS(LS_KEYS.saved, saved);
  },

  async addProgress({ userId, contentId, deltaSeconds }) {
    const authenticatedUserId = assertAuthenticatedUser(userId);
    const progress = getLS(LS_KEYS.progress);
    const existing = progress.find((x) => x.userId === userId && x.contentId === contentId);
    if (existing) {
      existing.progressSeconds += deltaSeconds;
      existing.updatedAt = nowIso();
    } else {
      progress.push({
        id: crypto.randomUUID(),
        userId,
        contentId,
        progressSeconds: deltaSeconds,
        updatedAt: nowIso()
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
      userId: authenticatedUserId,
      type,
      notes: notes || '',
      cancelRequested: false,
      status: 'pending',
      createdAt: nowIso()
    });
    setLS(LS_KEYS.requests, requests);
  },

  async listRequests(userId) {
    return sortByDateDesc(getLS(LS_KEYS.requests).filter((x) => x.userId === userId), 'createdAt');
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

  async requestAccountDeletion({ userId, reason }) {
    const privacyRequests = getLS(LS_KEYS.privacy);
    privacyRequests.push({
      id: crypto.randomUUID(),
      userId,
      type: 'delete_account_and_data',
      status: 'submitted',
      reason: reason || 'user_requested',
      createdAt: nowIso()
    });
    setLS(LS_KEYS.privacy, privacyRequests);

    setLS(
      LS_KEYS.saved,
      getLS(LS_KEYS.saved).filter((row) => row.userId !== userId)
    );
    setLS(
      LS_KEYS.progress,
      getLS(LS_KEYS.progress).filter((row) => row.userId !== userId)
    );
    setLS(
      LS_KEYS.requests,
      getLS(LS_KEYS.requests).filter((row) => row.userId !== userId)
    );

    const users = getLS(LS_KEYS.users).map((row) => {
      if (row.uid !== userId) return row;
      return {
        ...row,
        status: 'pending_deletion',
        updatedAt: nowIso(),
        deletedAt: nowIso()
      };
    });
    setLS(LS_KEYS.users, users);
  },

  async createParentalConsentPlaceholder({ userId, childAge, jurisdiction }) {
    const rows = getLS(LS_KEYS.parentalConsent);
    rows.push({
      id: crypto.randomUUID(),
      userId,
      childAge,
      jurisdiction,
      status: 'placeholder_pending_verification',
      createdAt: new Date().toISOString()
    });
    setLS(LS_KEYS.parentalConsent, rows);
  },

  async seedDefaultContent() {
    requireAdminClaim();
    const content = await loadDefaultContent();
    setLS(LS_KEYS.content, content);
  }
};

export const __mockStorage = { getLS };
