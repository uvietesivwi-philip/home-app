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

    if (!localStorage.getItem(COLLECTION_KEYS.content)) {
      setLS(COLLECTION_KEYS.content, await loadDefaultContent());
    }

    ensureCollectionsInitialized();
  },

  async listContent(filters = {}) {
    return contentRepository.listContent(filters);
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

  async continueWatching(userId) {
    const progress = await contentProgressRepository.getResumeItem(userId);
    if (!progress) return null;

    const content = await contentRepository.getById(progress.contentId);
    return content ? { progress, content } : null;
  },

  async createRequest(payload) {
    await requestRepository.submit(payload);
  },

  async listRequests(userId) {
    return requestRepository.listByUser(userId);
  },

  async updateRequestNotes({ userId, requestId, notes, preferredTime }) {
    await requestRepository.updateUserDetails({ userId, requestId, notes, preferredTime });
  },

  async seedDefaultContent() {
    const content = await loadDefaultContent();
    setLS(COLLECTION_KEYS.content, content);
  },

  // Firestore-spec query methods.
  async getResumeProgress(userId) {
    return contentProgressRepository.getResumeItem(userId);
  },

  async getSuggestedContent(limitCount = 2) {
    return contentRepository.listSuggestedContent(limitCount);
  },

  async listCookAfrican() {
    return contentRepository.listCookAfrican();
  },

  async listCookContinental() {
    return contentRepository.listCookContinental();
  },

  async listCareBySubcategory(subcategory) {
    return contentRepository.listCareBySubcategory(subcategory);
  },

  async listDiyGuides() {
    return contentRepository.listDiyGuides();
  },

  async listFamilyParentActivities() {
    return contentRepository.listFamilyParentActivities();
  },

  async listFamilyKidStories() {
    return contentRepository.listFamilyKidStories();
  },

  async submitServiceRequest(payload) {
    return requestRepository.submit(payload);
  },

  async upsertContentProgress({ userId, contentId, progressSeconds }) {
    return contentProgressRepository.upsertProgress({ userId, contentId, progressSeconds });
  }
};

export const __mockStorage = { getLS };
