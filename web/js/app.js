import { authApi, dataApi } from './store.js';
import { ContentFilters } from './components/content-filters.js';
import { resolveCategoryQuery } from './categories/query-builders.js';

const els = {
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  contentList: document.getElementById('contentList'),
  detailScreen: document.getElementById('detailScreen'),
  detailState: document.getElementById('detailState'),
  detailTitle: document.getElementById('detailTitle'),
  detailDescription: document.getElementById('detailDescription'),
  detailMedia: document.getElementById('detailMedia'),
  detailMetadata: document.getElementById('detailMetadata'),
  backToList: document.getElementById('backToList'),
  tpl: document.getElementById('contentItemTemplate')
};

const state = {
  currentUser: null,
  rows: []
};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getRoute() {
  const match = window.location.hash.match(/^#\/content\/([^/?#]+)/);
  return { contentId: match ? decodeURIComponent(match[1]) : null };
}

function renderList() {
  els.contentList.innerHTML = '';
  state.rows.forEach((row) => {
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

function renderMetadata(detail) {
  const metadata = [
    ['Difficulty', detail.difficulty],
    ['Duration', detail.durationMin ? `${detail.durationMin} min` : null],
    ['Language', detail.language]
  ].filter(([, value]) => Boolean(value));

  if (!metadata.length) {
    els.detailMetadata.innerHTML = '<li>No metadata available.</li>';
    return;
  }

  els.detailMetadata.innerHTML = metadata
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
    .join('');
}

function renderMedia(detail) {
  const src = detail.resolvedMediaUrl;
  if (!src) {
    els.detailMedia.innerHTML = '<p class="small">Media source is unavailable or invalid.</p>';
    return;
  }

  els.detailMedia.innerHTML = `
    <video controls preload="metadata" width="100%">
      <source src="${escapeHtml(src)}" type="video/mp4" />
      Your browser does not support video playback.
    </video>
  `;
}

async function renderDetail(contentId) {
  if (!contentId) {
    showDetailState('Select a content item to view details.');
    return;
  }

  showDetailState('Loading content...');
  try {
    const detail = await dataApi.getContentById({
      contentId,
      userId: state.currentUser?.uid
    });

    els.detailState.hidden = true;
    els.detailTitle.textContent = detail.title || 'Untitled content';
    els.detailDescription.textContent = detail.description || detail.summary || 'No description available.';
    renderMedia(detail);
    renderMetadata(detail);
  } catch (error) {
    if (error?.code === 'not-found') {
      showDetailState('This content is missing or no longer available.');
      return;
    }
    if (error?.code === 'permission-denied') {
      showDetailState('You do not have permission to view this content. Please sign in.');
      return;
    }
    showDetailState('Unable to load content right now. Please try again.');
  }
}

async function renderRoute() {
  const { contentId } = getRoute();
  await renderDetail(contentId);
}

async function refresh() {
  state.currentUser = authApi.getCurrentUser();
  state.rows = await dataApi.listContent();
  renderList();
  await renderRoute();
}

els.loginBtn.addEventListener('click', async () => {
  await authApi.signInDemo();
  await refresh();
});

els.logoutBtn.addEventListener('click', async () => {
  await authApi.signOut();
  await refresh();
});

els.backToList.addEventListener('click', () => {
  window.location.hash = '#/';
});

window.addEventListener('hashchange', () => {
  renderRoute();
});

await dataApi.bootstrap();
await refresh();
