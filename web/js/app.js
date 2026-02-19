import { authApi, dataApi } from './store.js';
import { ContentFilters } from './components/content-filters.js';
import { resolveCategoryQuery } from './categories/query-builders.js';

const PAGE_SIZE = 4;

const els = {
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  filterMount: document.getElementById('filterMount'),
  queryPreview: document.getElementById('queryPreview'),
  contentList: document.getElementById('contentList'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  pageMeta: document.getElementById('pageMeta'),
  refreshContent: document.getElementById('refreshContent'),
  savedList: document.getElementById('savedList'),
  continueBox: document.getElementById('continueBox'),
  requestForm: document.getElementById('requestForm'),
  requestList: document.getElementById('requestList'),
  savedCount: document.getElementById('savedCount'),
  requestCount: document.getElementById('requestCount'),
  tpl: document.getElementById('contentItemTemplate')
};

const state = {
  currentUser: null,
  filters: { category: 'all', subcategory: 'all', type: 'all' },
  page: 1
};

const filters = new ContentFilters({
  root: els.filterMount,
  onChange(nextFilters) {
    state.filters = nextFilters;
    state.page = 1;
    renderContent();
  }
});

function ensureSignedIn() {
  if (!state.currentUser) throw new Error('Sign in first.');
}

function renderQueryPreview() {
  const query = resolveCategoryQuery(state.filters);
  els.queryPreview.textContent = JSON.stringify(query, null, 2);
}

async function renderContent() {
  renderQueryPreview();

  const result = await dataApi.listContent({
    ...state.filters,
    page: state.page,
    limit: PAGE_SIZE
  });

  els.contentList.innerHTML = '';

  if (!result.rows.length) {
    els.contentList.innerHTML = '<p class="small">No content matched this filter set.</p>';
  }

  result.rows.forEach((row) => {
    const node = els.tpl.content.cloneNode(true);
    node.querySelector('.title').textContent = row.title;
    node.querySelector('.summary').textContent = row.summary;
    node.querySelector('.meta').textContent = `${row.category}/${row.subcategory} • ${row.type}`;

    node.querySelector('.saveBtn').addEventListener('click', async () => {
      ensureSignedIn();
      await dataApi.saveContent({ userId: state.currentUser.uid, contentId: row.id });
      await renderSaved();
    });

    node.querySelector('.progressBtn').addEventListener('click', async () => {
      ensureSignedIn();
      await dataApi.addProgress({ userId: state.currentUser.uid, contentId: row.id, deltaSeconds: 30 });
      await renderContinueWatching();
    });

    els.contentList.appendChild(node);
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  els.pageMeta.textContent = `Page ${state.page} of ${totalPages} (${result.total} items)`;
  els.prevPageBtn.disabled = state.page <= 1;
  els.nextPageBtn.disabled = !result.hasMore;
}

async function renderSaved() {
  if (!state.currentUser) {
    els.savedList.innerHTML = '<p class="small">Sign in to see saved content.</p>';
    els.savedCount.textContent = '0';
    return;
  }

  const rows = await dataApi.listSaved(state.currentUser.uid);
  els.savedCount.textContent = String(rows.length);
  els.savedList.innerHTML = rows.length
    ? rows.map((row) => `<article class="item"><strong>${row.content.title}</strong></article>`).join('')
    : '<p class="small">No saved content yet.</p>';
}

async function renderContinueWatching() {
  if (!state.currentUser) {
    els.continueBox.innerHTML = '<p class="small">Sign in to track progress.</p>';
    return;
  }

  const cw = await dataApi.continueWatching(state.currentUser.uid);
  els.continueBox.innerHTML = cw
    ? `<article class="item"><strong>${cw.content.title}</strong><p class="small">${cw.progress.progressSeconds}s watched</p></article>`
    : '<p class="small">No progress tracked yet.</p>';
}

async function renderRequests() {
  if (!state.currentUser) {
    els.requestList.innerHTML = '<p class="small">Sign in to submit and view requests.</p>';
    els.requestCount.textContent = '0';
    return;
  }

  const rows = await dataApi.listRequests(state.currentUser.uid);
  els.requestCount.textContent = String(rows.length);
  els.requestList.innerHTML = rows.length
    ? rows.map((row) => `<article class="item"><strong>${row.type}</strong><p>${row.notes || '(no notes)'}</p></article>`).join('')
    : '<p class="small">No requests yet.</p>';
}

async function refreshAll() {
  state.currentUser = authApi.getCurrentUser();
  await Promise.all([renderContent(), renderSaved(), renderContinueWatching(), renderRequests()]);
}

els.loginBtn.addEventListener('click', async () => {
  await authApi.signInDemo();
  await refreshAll();
});

els.logoutBtn.addEventListener('click', async () => {
  await authApi.signOut();
  await refreshAll();
});

els.prevPageBtn.addEventListener('click', async () => {
  if (state.page <= 1) return;
  state.page -= 1;
  await renderContent();
});

els.nextPageBtn.addEventListener('click', async () => {
  state.page += 1;
  await renderContent();
});

els.refreshContent.addEventListener('click', () => renderContent());

els.requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  ensureSignedIn();
  const fd = new FormData(els.requestForm);
  await dataApi.createRequest({
    userId: state.currentUser.uid,
    type: fd.get('type'),
    phone: fd.get('phone'),
    location: fd.get('location'),
    notes: fd.get('notes'),
    preferredTime: fd.get('preferredTime')
  });
  els.requestForm.reset();
  await renderRequests();
});

await dataApi.bootstrap();
filters.render();
await refreshAll();
