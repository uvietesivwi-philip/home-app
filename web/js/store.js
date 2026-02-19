import { APP_CONFIG } from './config.js';

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

function getLS(key, fallback = []) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

  async listContent({ category, subcategory } = {}) {
    let rows = getLS(LS_KEYS.content);
    if (category && category !== 'all') rows = rows.filter((x) => x.category === category);
    if (subcategory && subcategory !== 'all') rows = rows.filter((x) => x.subcategory === subcategory);
    return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    const saved = getLS(LS_KEYS.saved);
    if (!saved.find((x) => x.userId === userId && x.contentId === contentId)) {
      saved.push({ id: crypto.randomUUID(), userId, contentId, savedAt: nowIso() });
      setLS(LS_KEYS.saved, saved);
    }
  },

  async removeSaved({ userId, savedId }) {
    const saved = getLS(LS_KEYS.saved).filter((row) => !(row.id === savedId && row.userId === userId));
    setLS(LS_KEYS.saved, saved);
  },

  async addProgress({ userId, contentId, deltaSeconds }) {
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
      createdAt: nowIso()
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

  async seedDefaultContent() {
    const content = await loadDefaultContent();
    setLS(LS_KEYS.content, content);
  }
};
