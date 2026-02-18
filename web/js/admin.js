import { dataApi } from './store.js';

const seedBtn = document.getElementById('seedBtn');
const seedStatus = document.getElementById('seedStatus');
const contentList = document.getElementById('contentAdminList');

async function renderContent() {
  const rows = await dataApi.listContent({});
  contentList.innerHTML = rows
    .map((row) => `<div class="item"><strong>${row.title}</strong><div class="small">${row.category}/${row.subcategory} • ${row.type}</div></div>`)
    .join('');
}

seedBtn.addEventListener('click', async () => {
  await dataApi.seedDefaultContent();
  seedStatus.textContent = 'Default content seeded.';
  await renderContent();
});

await dataApi.bootstrap();
await renderContent();
