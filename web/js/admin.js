import { authApi, dataApi } from './store.js';

const seedBtn = document.getElementById('seedBtn');
const seedStatus = document.getElementById('seedStatus');
const contentList = document.getElementById('contentAdminList');
const claimStatus = document.getElementById('claimStatus');

async function renderContent() {
  const rows = await dataApi.listContent({});
  contentList.innerHTML = rows
    .map((row) => `<div class="item"><strong>${row.title}</strong><div class="small">${row.category}/${row.subcategory} • ${row.type}</div></div>`)
    .join('');
}

function applyClaimGuard() {
  const currentUser = authApi.getCurrentUser();
  const hasAdminClaim = authApi.hasAdminClaim();

  if (!currentUser) {
    claimStatus.textContent = 'No active user session. Sign in with Firebase Auth first.';
    seedBtn.disabled = true;
    return;
  }

  if (!hasAdminClaim) {
    claimStatus.textContent = `Signed in as ${currentUser.uid}, but admin claim is missing.`;
    seedBtn.disabled = true;
    return;
  }

  claimStatus.textContent = `Signed in as ${currentUser.uid} with admin claim.`;
  seedBtn.disabled = false;
}

seedBtn.addEventListener('click', async () => {
  try {
    await dataApi.seedDefaultContent();
    seedStatus.textContent = 'Default content seeded.';
    await renderContent();
  } catch (error) {
    seedStatus.textContent = error.message;
  }
});

await dataApi.bootstrap();
await authApi.signInDemo();
applyClaimGuard();
await renderContent();
