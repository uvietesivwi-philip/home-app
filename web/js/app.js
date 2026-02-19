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
  sortBy: 'newest',
  selectedContentId: null
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

function textIncludes(row, query) {
  if (!query) return true;
  const blob = [row.title, row.summary, row.description, ...(row.tags || [])].join(' ').toLowerCase();
  return blob.includes(query.toLowerCase());
}

function sortRows(rows) {
  const out = [...rows];
  if (state.sortBy === 'oldest') {
    out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (state.sortBy === 'shortest') {
    out.sort((a, b) => (a.durationMin || 999) - (b.durationMin || 999));
  } else {
    out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return out;
}

async function getVisibleContent() {
  const rows = await dataApi.listContent({ category: state.category, subcategory: state.subcategory || undefined });
  return sortRows(rows.filter((row) => textIncludes(row, state.searchTerm)));
}

function renderCategoryJourney() {
  els.categoryGrid.innerHTML = '';
  Object.keys(taxonomy).forEach((category) => {
    els.categoryGrid.appendChild(
      createPill(category.toUpperCase(), state.category === category, async () => {
        state.category = category;
        state.subcategory = null;
        renderSubcategories();
        await renderContent();
      })
    );
  });
}

function renderSubcategories() {
  els.subcategoryGrid.innerHTML = '';
  const subs = taxonomy[state.category] || [];
  els.subcategoryGrid.appendChild(
    createPill('ALL', state.subcategory === null, async () => {
      state.subcategory = null;
      renderSubcategories();
      await renderContent();
    })
  );
  subs.forEach((sub) => {
    els.subcategoryGrid.appendChild(
      createPill(sub, state.subcategory === sub, async () => {
        state.subcategory = sub;
        renderSubcategories();
        await renderContent();
      })
    );
  });
}

function renderDetail(row) {
  if (!row) {
    els.detailBox.innerHTML = '<p class="small">Select “View details” on any content item to see richer guidance here.</p>';
    return;
  }

  const videoHtml = row.bgVideo
    ? `<video class="detail-video" autoplay muted loop playsinline><source src="${row.bgVideo}" type="video/mp4" /></video><div class="detail-video-overlay"></div>`
    : '';

  els.detailBox.innerHTML = `
    <div class="detail-media">
      ${videoHtml}
      <img class="detail-image" src="${row.coverImage || ''}" alt="${row.title} visual" />
    </div>
    <h3>${row.title}</h3>
    <p class="subtle">${row.description || row.summary}</p>
    <p class="small">Category: <strong>${row.category}/${row.subcategory}</strong> • Type: <strong>${row.type}</strong></p>
    <p class="small">Audience: <strong>${row.audience || 'general'}</strong> • Duration: <strong>${row.durationMin || '-'} min</strong></p>
  `;
}

async function renderContent() {
  const rows = await getVisibleContent();
  els.contentList.innerHTML = '';

  if (!rows.length) {
    els.contentList.innerHTML = '<p class="small">No content matched your current filters. Try another search or category.</p>';
    renderDetail(null);
    return;
  }

  rows.forEach((row) => {
    const node = els.tpl.content.cloneNode(true);
    node.querySelector('.meta').textContent = `${row.category}/${row.subcategory}`;
    node.querySelector('.cover').src = row.coverImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80';
    node.querySelector('.cover').alt = `${row.title} cover image`;
    node.querySelector('.media-chip').textContent = row.type.toUpperCase();
    node.querySelector('.audience').textContent = row.audience || 'general';
    node.querySelector('.title').textContent = row.title;
    node.querySelector('.summary').textContent = row.summary;
    node.querySelector('.details').textContent = `${row.type.toUpperCase()} • ${row.durationMin || '-'} min`;
    node.querySelector('.tags').innerHTML = (row.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join('');

    node.querySelector('.viewBtn').addEventListener('click', () => {
      state.selectedContentId = row.id;
      renderDetail(row);
    });

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

  const selected = rows.find((x) => x.id === state.selectedContentId) || rows[0];
  state.selectedContentId = selected.id;
  renderDetail(selected);
}

async function renderSaved() {
  if (!state.currentUser) {
    els.savedList.innerHTML = '<p class="small">Sign in to save and review your content list.</p>';
    els.savedCount.textContent = '0';
    return;
  }

  const rows = await dataApi.listSaved(state.currentUser.uid);
  els.savedCount.textContent = String(rows.length);

  if (!rows.length) {
    els.savedList.innerHTML = '<p class="small">No saved content yet.</p>';
    return;
  }

  els.savedList.innerHTML = rows
    .map(
      (row) => `<article class="item"><strong>${row.content.title}</strong><p class="small">${row.content.category}/${row.content.subcategory} • saved ${new Date(row.savedAt).toLocaleString()}</p></article>`
    )
    .join('');
}

async function renderContinueWatching() {
  if (!state.currentUser) {
    els.continueBox.innerHTML = '<p class="small">Sign in to track progress and resume content.</p>';
    return;
  }

  const row = await dataApi.continueWatching(state.currentUser.uid);
  if (!row) {
    els.continueBox.innerHTML = '<p class="small">No progress yet. Tap +30s on content to start tracking.</p>';
    return;
  }

  els.continueBox.innerHTML = `<article class="item"><strong>${row.content.title}</strong><p class="small">${row.progress.progressSeconds}s tracked • updated ${new Date(row.progress.updatedAt).toLocaleString()}</p></article>`;
}

function buildRequestEditor(row) {
  const item = document.createElement('article');
  item.className = 'item';

  const locked = row.status !== 'pending';
  const statusLabel = row.cancelRequested ? `${row.status} (cancel requested)` : row.status;

  item.innerHTML = `
    <div class="request-top">
      <strong>${row.type.toUpperCase()} request</strong>
      <span class="status">${statusLabel}</span>
    </div>
    <p class="small">Created ${new Date(row.createdAt).toLocaleString()}</p>
    <label>Notes
      <textarea rows="2" ${locked ? 'disabled' : ''}>${row.notes || ''}</textarea>
    </label>
    <label class="checkbox-row">
      <input type="checkbox" ${row.cancelRequested ? 'checked' : ''} ${locked ? 'disabled' : ''} />
      Request cancellation
    </label>
    <button class="secondary" ${locked ? 'disabled' : ''}>Save update</button>
  `;

  const textarea = item.querySelector('textarea');
  const checkbox = item.querySelector('input[type="checkbox"]');
  const saveBtn = item.querySelector('button');

  if (!locked) {
    saveBtn.addEventListener('click', async () => {
      await dataApi.updateRequestByUser({
        userId: state.currentUser.uid,
        requestId: row.id,
        notes: textarea.value,
        cancelRequested: checkbox.checked
      });
      await renderRequests();
    });
  }

  return item;
}

async function renderRequests() {
  if (!state.currentUser) {
    els.requestList.innerHTML = '<p class="small">Sign in to submit and view your request history.</p>';
    els.requestCount.textContent = '0';
    return;
  }

  const rows = await dataApi.listRequests(state.currentUser.uid);
  els.requestCount.textContent = String(rows.length);

  if (!rows.length) {
    els.requestList.innerHTML = '<p class="small">No request history yet.</p>';
    return;
  }

  els.requestList.innerHTML = '';
  rows.forEach((row) => {
    els.requestList.appendChild(buildRequestEditor(row));
  });
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
    notes: fd.get('notes')
  });
  els.requestForm.reset();
  await renderRequests();
});

await dataApi.bootstrap();
renderCategoryJourney();
renderSubcategories();
await refreshAll();
