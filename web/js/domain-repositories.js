const COLLECTION_KEYS = {
  users: 'hh_users',
  content: 'hh_content',
  savedContent: 'hh_saved',
  contentProgress: 'hh_progress',
  requests: 'hh_requests'
};

function getLS(key, fallback = []) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function createTimestamp() {
  return new Date().toISOString();
}

export function buildProgressDocumentId(userId, contentId) {
  return `${userId}_${contentId}`;
}

export class UserRepository {
  async getById(userId) {
    return getLS(COLLECTION_KEYS.users, []).find((x) => x.id === userId) || null;
  }
}

export class ContentRepository {
  async getById(contentId) {
    return getLS(COLLECTION_KEYS.content, []).find((x) => x.id === contentId) || null;
  }

  async listSuggestedContent(limitCount = 2) {
    return getLS(COLLECTION_KEYS.content)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limitCount);
  }

  async listCookAfrican() {
    return this.listByCategoryAndSubcategory('cook', 'african');
  }

  async listCookContinental() {
    return this.listByCategoryAndSubcategory('cook', 'continental');
  }

  async listCareBySubcategory(subcategory) {
    return this.listByCategoryAndSubcategory('care', subcategory);
  }

  async listDiyGuides() {
    return getLS(COLLECTION_KEYS.content).filter((x) => x.category === 'diy');
  }

  async listFamilyParentActivities() {
    return getLS(COLLECTION_KEYS.content).filter((x) => x.category === 'family' && x.type === 'activity');
  }

  async listFamilyKidStories() {
    return getLS(COLLECTION_KEYS.content).filter((x) => x.category === 'family' && x.type === 'story');
  }

  async listByCategoryAndSubcategory(category, subcategory) {
    return getLS(COLLECTION_KEYS.content).filter(
      (x) => x.category === category && (!subcategory || x.subcategory === subcategory)
    );
  }

  async listContent({ category, subcategory } = {}) {
    return getLS(COLLECTION_KEYS.content)
      .filter((x) => !category || category === 'all' || x.category === category)
      .filter((x) => !subcategory || subcategory === 'all' || x.subcategory === subcategory)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export class SavedContentRepository {
  async save({ userId, contentId }) {
    const rows = getLS(COLLECTION_KEYS.savedContent);
    if (rows.find((x) => x.userId === userId && x.contentId === contentId)) return;
    rows.push({
      id: crypto.randomUUID(),
      userId,
      contentId,
      savedAt: createTimestamp()
    });
    setLS(COLLECTION_KEYS.savedContent, rows);
  }

  async listByUser(userId) {
    return getLS(COLLECTION_KEYS.savedContent).filter((x) => x.userId === userId);
  }
}

export class ContentProgressRepository {
  async upsertProgress({ userId, contentId, progressSeconds }) {
    const rows = getLS(COLLECTION_KEYS.contentProgress);
    const id = buildProgressDocumentId(userId, contentId);
    const existing = rows.find((x) => x.id === id);

    if (existing) {
      existing.progressSeconds = progressSeconds;
      existing.updatedAt = createTimestamp();
    } else {
      rows.push({
        id,
        userId,
        contentId,
        progressSeconds,
        updatedAt: createTimestamp()
      });
    }

    setLS(COLLECTION_KEYS.contentProgress, rows);
  }

  async getResumeItem(userId) {
    const rows = getLS(COLLECTION_KEYS.contentProgress)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return rows[0] || null;
  }

  async getByUserAndContent(userId, contentId) {
    const id = buildProgressDocumentId(userId, contentId);
    return getLS(COLLECTION_KEYS.contentProgress).find((x) => x.id === id) || null;
  }
}

export class RequestRepository {
  async submit({ userId, type, notes, preferredTime = null, phone = null, location = null }) {
    const rows = getLS(COLLECTION_KEYS.requests);
    rows.push({
      id: crypto.randomUUID(),
      userId,
      type,
      phone,
      location,
      notes,
      preferredTime,
      status: 'pending',
      createdAt: createTimestamp()
    });
    setLS(COLLECTION_KEYS.requests, rows);
  }

  async listByUser(userId) {
    return getLS(COLLECTION_KEYS.requests)
      .filter((x) => x.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async updateUserDetails({ userId, requestId, notes, preferredTime }) {
    const rows = getLS(COLLECTION_KEYS.requests);
    const row = rows.find((x) => x.id === requestId && x.userId === userId);
    if (!row) return;
    row.notes = notes;
    row.preferredTime = preferredTime || row.preferredTime;
    setLS(COLLECTION_KEYS.requests, rows);
  }
}

export function ensureCollectionsInitialized() {
  if (!localStorage.getItem(COLLECTION_KEYS.users)) setLS(COLLECTION_KEYS.users, []);
  if (!localStorage.getItem(COLLECTION_KEYS.savedContent)) setLS(COLLECTION_KEYS.savedContent, []);
  if (!localStorage.getItem(COLLECTION_KEYS.contentProgress)) setLS(COLLECTION_KEYS.contentProgress, []);
  if (!localStorage.getItem(COLLECTION_KEYS.requests)) setLS(COLLECTION_KEYS.requests, []);
}

export { COLLECTION_KEYS, getLS, setLS };
