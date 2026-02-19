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
  deleteAccountBtn: document.getElementById('deleteAccountBtn'),
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
  profileBox: document.getElementById('profileBox'),
  tpl: document.getElementById('contentItemTemplate')
};

const state = {
  currentUser: null,
  rows: []
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

function getRoute() {
  const match = window.location.hash.match(/^#\/content\/([^/?#]+)/);
  return { contentId: match ? decodeURIComponent(match[1]) : null };
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
    node.querySelector('.title').textContent = row.title;
    node.querySelector('.summary').textContent = row.summary || row.description || '';
    node.querySelector('.meta').textContent = `${row.category}/${row.subcategory}`;
    node.querySelector('.viewBtn').addEventListener('click', () => {
      window.location.hash = `#/content/${encodeURIComponent(row.id)}`;
    });
    els.contentList.appendChild(node);
  });
}

function showDetailState(message) {
  els.detailState.textContent = message;
  els.detailState.hidden = false;
  els.detailTitle.textContent = '';
  els.detailDescription.textContent = '';
  els.detailMedia.innerHTML = '';
  els.detailMetadata.innerHTML = '';
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

  els.savedList.innerHTML = '';
  rows.forEach((row) => {
    const item = document.createElement('article');
    item.className = 'item';

    if (row.isOrphaned) {
      item.innerHTML = `
        <strong>Unavailable content</strong>
        <p class="small">This saved entry references deleted content (${row.contentId}).</p>
        <button class="secondary remove-orphan">Remove entry</button>
      `;
      item.querySelector('.remove-orphan').addEventListener('click', async () => {
        await dataApi.removeSaved({ userId: state.currentUser.uid, savedId: row.id });
        await renderSaved();
      });
    } else {
      item.innerHTML = `
        <strong>${row.content.title}</strong>
        <p class="small">${row.content.category}/${row.content.subcategory} • saved ${new Date(row.savedAt).toLocaleString()}</p>
      `;
    }

    els.savedList.appendChild(item);
  });
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

  els.requestList.innerHTML = '';
  rows.forEach((row) => {
    const item = document.createElement('article');
    item.className = 'item';
    item.innerHTML = `
      <div class="request-top">
        <strong>${row.type.toUpperCase()} request</strong>
        <span class="status">${row.status}</span>
      </div>
      <p class="small">Phone: ${row.phone || '-'} • Location: ${row.location || '-'}</p>
      <p>${row.notes || '(no notes)'}</p>
      <p class="small">Created ${new Date(row.createdAt).toLocaleString()}</p>
      <label>Update notes
        <textarea rows="2">${row.notes || ''}</textarea>
      </label>
      <button class="secondary">Save Notes</button>
    `;

    const textarea = item.querySelector('textarea');
    item.querySelector('button').addEventListener('click', async () => {
      await dataApi.updateRequestNotes({
        userId: state.currentUser.uid,
        requestId: row.id,
        notes: textarea.value,
        preferredTime: row.preferredTime
      });
      await renderRequests();
    });

    els.requestList.appendChild(item);
  });
}

async function renderProfile() {
  if (!state.currentUser) {
    els.profileBox.innerHTML = '<p class="small">Sign in to load your profile from <code>users/{uid}</code>.</p>';
    return;
  }

  const profile = await dataApi.getUserProfile(state.currentUser.uid);
  if (!profile) {
    els.profileBox.innerHTML = '<p class="small">Profile document not found.</p>';
    return;
  }

  els.profileBox.innerHTML = `
    <article class="item">
      <strong>${profile.fullName}</strong>
      <p class="small">UID: ${profile.uid}</p>
      <p class="small">${profile.email} • ${profile.plan}</p>
      <p class="small">Status: ${profile.status}</p>
      <p class="small">Joined ${new Date(profile.createdAt).toLocaleString()}</p>
    </article>
  `;
}

async function refreshAll() {
  state.currentUser = authApi.getCurrentUser();
  await Promise.all([renderProfile(), renderContent(), renderSaved(), renderContinueWatching(), renderRequests()]);
}

els.loginBtn.addEventListener('click', async () => {
  await authApi.signInDemo();
  await refresh();
});

els.logoutBtn.addEventListener('click', async () => {
  await authApi.signOut();
  await refresh();
});

els.deleteAccountBtn.addEventListener('click', async () => {
  ensureSignedIn();
  const approved = window.confirm('Submit account deletion + data erase request and sign out?');
  if (!approved) return;
  await dataApi.requestAccountDeletion({ userId: state.currentUser.uid, reason: 'privacy_compliance_request' });
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
