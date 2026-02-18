import { authApi, dataApi } from './store.js';

const categories = {
  all: ['all'],
  cook: ['all', 'african', 'continental'],
  care: ['all', 'bathing', 'dressing', 'hairstyling'],
  diy: ['all', 'decor', 'maintenance'],
  family: ['all', 'parents', 'kids']
};

const els = {
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  categoryGrid: document.getElementById('categoryGrid'),
  categoryFilter: document.getElementById('categoryFilter'),
  subcategoryFilter: document.getElementById('subcategoryFilter'),
  refreshContent: document.getElementById('refreshContent'),
  contentList: document.getElementById('contentList'),
  savedList: document.getElementById('savedList'),
  continueBox: document.getElementById('continueBox'),
  requestForm: document.getElementById('requestForm'),
  requestList: document.getElementById('requestList'),
  tpl: document.getElementById('contentItemTemplate')
};

let currentUser = null;

function renderCategories() {
  els.categoryGrid.innerHTML = '';
  Object.keys(categories).filter((x) => x !== 'all').forEach((category) => {
    const div = document.createElement('div');
    div.className = 'badge';
    div.textContent = `${category.toUpperCase()} • ${categories[category].length - 1} tracks`;
    els.categoryGrid.appendChild(div);
  });
}

function hydrateFilters() {
  els.categoryFilter.innerHTML = Object.keys(categories)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join('');
  fillSubcategories('all');
}

function fillSubcategories(category) {
  const options = categories[category] || ['all'];
  els.subcategoryFilter.innerHTML = options.map((s) => `<option value="${s}">${s}</option>`).join('');
}

function mustAuth() {
  if (!currentUser) throw new Error('Sign in first.');
}

async function renderContent() {
  const category = els.categoryFilter.value;
  const subcategory = els.subcategoryFilter.value;
  const rows = await dataApi.listContent({
    category: category === 'all' ? undefined : category,
    subcategory: subcategory === 'all' ? undefined : subcategory
  });
  els.contentList.innerHTML = '';
  rows.forEach((row) => {
    const node = els.tpl.content.cloneNode(true);
    node.querySelector('.title').textContent = row.title;
    node.querySelector('.summary').textContent = row.summary;
    node.querySelector('.meta').textContent = `${row.category}/${row.subcategory} • ${row.type}`;
    node.querySelector('.saveBtn').addEventListener('click', async () => {
      mustAuth();
      await dataApi.saveContent({ userId: currentUser.uid, contentId: row.id });
      await renderSaved();
    });
    node.querySelector('.progressBtn').addEventListener('click', async () => {
      mustAuth();
      await dataApi.addProgress({ userId: currentUser.uid, contentId: row.id, deltaSeconds: 30 });
      await renderContinueWatching();
    });
    els.contentList.appendChild(node);
  });
}

async function renderSaved() {
  els.savedList.innerHTML = '';
  if (!currentUser) {
    els.savedList.innerHTML = '<p class="small">Sign in to see saved content.</p>';
    return;
  }
  const rows = await dataApi.listSaved(currentUser.uid);
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
  els.continueBox.innerHTML = '';
  if (!currentUser) {
    els.continueBox.innerHTML = '<p class="small">Sign in to track progress.</p>';
    return;
  }
  const cw = await dataApi.continueWatching(currentUser.uid);
  if (!cw) {
    els.continueBox.innerHTML = '<p class="small">No progress tracked yet.</p>';
    return;
  }
  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `<strong>${cw.content.title}</strong><div class="small">Progress: ${cw.progress.progressSeconds}s</div>`;
  els.continueBox.appendChild(div);
}

async function renderRequests() {
  els.requestList.innerHTML = '';
  if (!currentUser) {
    els.requestList.innerHTML = '<p class="small">Sign in to submit and view requests.</p>';
    return;
  }
  const rows = await dataApi.listRequests(currentUser.uid);
  if (!rows.length) {
    els.requestList.innerHTML = '<p class="small">No requests yet.</p>';
    return;
  }
  rows.forEach((row) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <strong>${row.type.toUpperCase()} • ${row.status}</strong>
      <p>${row.notes || '(no notes)'}</p>
      <p class="small">${new Date(row.createdAt).toLocaleString()}</p>
      <label>Update notes
        <textarea rows="2">${row.notes || ''}</textarea>
      </label>
      <button class="secondary">Save Notes</button>
    `;
    const textarea = div.querySelector('textarea');
    div.querySelector('button').addEventListener('click', async () => {
      await dataApi.updateRequestNotes({
        userId: currentUser.uid,
        requestId: row.id,
        notes: textarea.value,
        preferredTime: row.preferredTime
      });
      await renderRequests();
    });
    els.requestList.appendChild(div);
  });
}

async function refreshAll() {
  currentUser = authApi.getCurrentUser();
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
els.categoryFilter.addEventListener('change', async (e) => {
  fillSubcategories(e.target.value);
  await renderContent();
});
els.subcategoryFilter.addEventListener('change', renderContent);
els.refreshContent.addEventListener('click', renderContent);
els.requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  mustAuth();
  const fd = new FormData(els.requestForm);
  await dataApi.createRequest({
    userId: currentUser.uid,
    type: fd.get('type'),
    notes: fd.get('notes'),
    preferredTime: fd.get('preferredTime')
  });
  els.requestForm.reset();
  await renderRequests();
});

await dataApi.bootstrap();
renderCategories();
hydrateFilters();
await refreshAll();
