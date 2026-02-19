import { authApi, dataApi } from './store.js';

const taxonomy = {
  cook: ['african', 'continental'],
  care: ['bathing', 'dressing', 'hairstyling'],
  diy: ['decor', 'maintenance'],
  family: ['parents', 'kids']
};

const els = {
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  categoryGrid: document.getElementById('categoryGrid'),
  subcategoryGrid: document.getElementById('subcategoryGrid'),
  refreshContent: document.getElementById('refreshContent'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  contentList: document.getElementById('contentList'),
  detailBox: document.getElementById('detailBox'),
  savedList: document.getElementById('savedList'),
  continueBox: document.getElementById('continueBox'),
  suggestedList: document.getElementById('suggestedList'),
  requestForm: document.getElementById('requestForm'),
  requestList: document.getElementById('requestList'),
  savedCount: document.getElementById('savedCount'),
  requestCount: document.getElementById('requestCount'),
  tpl: document.getElementById('contentItemTemplate')
};

const state = {
  currentUser: null,
  category: 'cook',
  subcategory: null,
  searchTerm: '',
  sortBy: 'newest'
};

function ensureSignedIn() {
  if (!state.currentUser) throw new Error('Sign in to perform this action.');
}

function createPill(text, active, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `pill ${active ? 'active' : ''}`;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function setLoading(container, message = 'Loading...') {
  container.innerHTML = `<div class="item placeholder">${message}</div>`;
}

function setRetry(container, message, onRetry) {
  container.innerHTML = `<div class="item"><p class="small">${message}</p><button class="secondary retryBtn">Retry</button></div>`;
  container.querySelector('.retryBtn').addEventListener('click', onRetry);
}

function sortRows(rows) {
  const out = [...rows];
  if (state.sortBy === 'oldest') out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  else if (state.sortBy === 'shortest') out.sort((a, b) => (a.durationMin || 999) - (b.durationMin || 999));
  else out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return out;
}

function renderDetail(row) {
  if (!row) {
    els.detailBox.innerHTML = '<p class="small">Select “View details” on any content item to see richer guidance here.</p>';
    return;
  }
  els.detailBox.innerHTML = `
    <div class="detail-media">
      <img class="detail-image" src="${row.coverImage || ''}" alt="${row.title} visual" />
    </div>
    <h3>${row.title}</h3>
    <p class="subtle">${row.description || row.summary}</p>
    <p class="small">Category: <strong>${row.category}/${row.subcategory}</strong> • Type: <strong>${row.type}</strong></p>
  `;
}

async function getVisibleContent() {
  const rows = await dataApi.listContent({ category: state.category, subcategory: state.subcategory || undefined });
  const filtered = rows.filter((row) => {
    if (!state.searchTerm) return true;
    const blob = [row.title, row.summary, row.description, ...(row.tags || [])].join(' ').toLowerCase();
    return blob.includes(state.searchTerm.toLowerCase());
  });
  return sortRows(filtered);
}

async function renderContent() {
  setLoading(els.contentList, 'Loading content...');
  try {
    const rows = await getVisibleContent();
    els.contentList.innerHTML = '';
    if (!rows.length) {
      els.contentList.innerHTML = '<p class="small">No content matched your current filters.</p>';
      renderDetail(null);
      return;
    }
    rows.forEach((row) => {
      const node = els.tpl.content.cloneNode(true);
      node.querySelector('.meta').textContent = `${row.category}/${row.subcategory}`;
      node.querySelector('.cover').src = row.coverImage || '';
      node.querySelector('.media-chip').textContent = row.type.toUpperCase();
      node.querySelector('.audience').textContent = row.audience || 'general';
      node.querySelector('.title').textContent = row.title;
      node.querySelector('.summary').textContent = row.summary;
      node.querySelector('.details').textContent = `${row.durationMin || '-'} min`;
      node.querySelector('.tags').innerHTML = (row.tags || []).map((tag) => `<span class="chip">#${tag}</span>`).join('');
      node.querySelector('.viewBtn').addEventListener('click', () => renderDetail(row));
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
  } catch (error) {
    setRetry(els.contentList, 'Could not load content.', renderContent);
  }
}

async function renderSaved() {
  els.savedList.innerHTML = '';
  if (!state.currentUser) {
    els.savedList.innerHTML = '<p class="small">Sign in to see saved content.</p>';
    els.savedCount.textContent = '0';
    return;
  }
  const rows = await dataApi.listSaved(state.currentUser.uid);
  els.savedCount.textContent = String(rows.length);
  if (!rows.length) {
    els.savedList.innerHTML = '<p class="small">No saved content yet.</p>';
    return;
  }
  rows.forEach((row) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<strong>${row.content.title}</strong><div class="small">Saved ${new Date(row.savedAt).toLocaleString()}</div>`;
    els.savedList.appendChild(div);
  });
}

async function renderContinueWatching() {
  setLoading(els.continueBox, 'Loading latest progress...');
  if (!state.currentUser) {
    els.continueBox.innerHTML = '<p class="small">Sign in to track progress and resume content.</p>';
    return;
  }
  try {
    const latest = await dataApi.continueWatching(state.currentUser.uid);
    if (latest.state === 'empty') {
      els.continueBox.innerHTML = '<p class="small">No progress yet. Tap +30s on any content to start tracking.</p>';
      return;
    }
    if (latest.state === 'deleted') {
      els.continueBox.innerHTML = '<p class="small">Your latest progress references deleted content. Continue with a new guide.</p>';
      return;
    }
    if (latest.state === 'stale') {
      els.continueBox.innerHTML = '<p class="small">Latest progress looks stale or incomplete. Add new progress to refresh your journey.</p>';
      return;
    }
    els.continueBox.innerHTML = `
      <div class="item">
        <strong>${latest.content.title}</strong>
        <p class="small">${latest.progress.progressSeconds}s tracked • updated ${new Date(latest.progress.updatedAt).toLocaleString()}</p>
      </div>
    `;
  } catch (error) {
    setRetry(els.continueBox, 'Unable to fetch latest progress right now.', renderContinueWatching);
  }
}

async function renderSuggested() {
  setLoading(els.suggestedList, 'Loading suggested content...');
  try {
    const rows = await dataApi.listSuggestedContent(2);
    if (!rows.length) {
      els.suggestedList.innerHTML = '<p class="small">No suggested content available yet.</p>';
      return;
    }
    els.suggestedList.innerHTML = '';
    rows.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<strong>${row.title}</strong><p class="small">Created ${new Date(row.createdAt).toLocaleString()}</p>`;
      els.suggestedList.appendChild(div);
    });
  } catch (error) {
    setRetry(els.suggestedList, 'Unable to fetch suggestions right now.', renderSuggested);
  }
}

async function renderRequests() {
  els.requestList.innerHTML = '';
  if (!state.currentUser) {
    els.requestList.innerHTML = '<p class="small">Sign in to submit and view requests.</p>';
    els.requestCount.textContent = '0';
    return;
  }
  const rows = await dataApi.listRequests(state.currentUser.uid);
  els.requestCount.textContent = String(rows.length);
  if (!rows.length) {
    els.requestList.innerHTML = '<p class="small">No requests yet.</p>';
    return;
  }
  rows.forEach((row) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="request-top"><strong>${row.type.toUpperCase()}</strong><span class="status">${row.status}</span></div>
      <p>${row.notes || '(no notes)'}</p>
      <p class="small">${new Date(row.createdAt).toLocaleString()}</p>
    `;
    els.requestList.appendChild(div);
  });
}

function renderCategoryJourney() {
  els.categoryGrid.innerHTML = '';
  Object.keys(taxonomy).forEach((category) => {
    els.categoryGrid.appendChild(createPill(category.toUpperCase(), state.category === category, async () => {
      state.category = category;
      state.subcategory = null;
      renderSubcategories();
      await renderContent();
    }));
  });
}

function renderSubcategories() {
  els.subcategoryGrid.innerHTML = '';
  els.subcategoryGrid.appendChild(createPill('ALL', state.subcategory === null, async () => {
    state.subcategory = null;
    renderSubcategories();
    await renderContent();
  }));
  (taxonomy[state.category] || []).forEach((sub) => {
    els.subcategoryGrid.appendChild(createPill(sub, state.subcategory === sub, async () => {
      state.subcategory = sub;
      renderSubcategories();
      await renderContent();
    }));
  });
}

async function refreshAll() {
  state.currentUser = authApi.getCurrentUser();
  await Promise.all([renderContent(), renderSaved(), renderContinueWatching(), renderSuggested(), renderRequests()]);
}

els.loginBtn.addEventListener('click', async () => {
  await authApi.signInDemo();
  await refreshAll();
});

els.logoutBtn.addEventListener('click', async () => {
  await authApi.signOut();
  await refreshAll();
});

els.searchInput.addEventListener('input', async (event) => {
  state.searchTerm = event.target.value;
  await renderContent();
});

els.sortSelect.addEventListener('change', async (event) => {
  state.sortBy = event.target.value;
  await renderContent();
});

els.refreshContent.addEventListener('click', renderContent);

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
renderCategoryJourney();
renderSubcategories();
await refreshAll();
