import { describe, expect, it } from 'vitest';
import { createLocalDataRepository } from '../web/js/store.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    get(key, fallback = []) {
      return map.has(key) ? JSON.parse(map.get(key)) : fallback;
    },
    set(key, value) {
      map.set(key, JSON.stringify(value));
    },
    has(key) {
      return map.has(key);
    }
  };
}

const sampleContent = [
  {
    id: 'content-1',
    title: 'Meal prep basics',
    category: 'cook',
    subcategory: 'african',
    createdAt: '2025-01-02T00:00:00.000Z'
  },
  {
    id: 'content-2',
    title: 'DIY lighting',
    category: 'diy',
    subcategory: 'decor',
    createdAt: '2025-01-03T00:00:00.000Z'
  }
];

describe('local repository integration', () => {
  it('handles save content flow without duplicates', async () => {
    const repo = createLocalDataRepository({
      storage: createMemoryStorage(),
      contentLoader: async () => sampleContent,
      uuid: () => 'id-1',
      now: () => '2025-01-01T00:00:00.000Z'
    });

    await repo.bootstrap();
    await repo.saveContent({ userId: 'user-1', contentId: 'content-1' });
    await repo.saveContent({ userId: 'user-1', contentId: 'content-1' });

    const saved = await repo.listSaved('user-1');
    expect(saved).toHaveLength(1);
    expect(saved[0].content.title).toBe('Meal prep basics');
  });

  it('aggregates progress updates and returns continue watching item', async () => {
    const repo = createLocalDataRepository({
      storage: createMemoryStorage(),
      contentLoader: async () => sampleContent,
      uuid: () => 'id-progress',
      now: () => '2025-01-04T00:00:00.000Z'
    });

    await repo.bootstrap();
    await repo.addProgress({ userId: 'user-1', contentId: 'content-2', deltaSeconds: 30 });
    await repo.addProgress({ userId: 'user-1', contentId: 'content-2', deltaSeconds: 45 });

    const item = await repo.continueWatching('user-1');
    expect(item.progress.progressSeconds).toBe(75);
    expect(item.content.id).toBe('content-2');
  });

  it('creates service requests and returns user history in reverse chronological order', async () => {
    let idx = 0;
    const timestamps = ['2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z'];
    const repo = createLocalDataRepository({
      storage: createMemoryStorage(),
      contentLoader: async () => sampleContent,
      uuid: () => `request-${++idx}`,
      now: () => timestamps[idx - 1]
    });

    await repo.bootstrap();
    await repo.createRequest({ userId: 'user-1', type: 'maid', notes: 'help clean kitchen' });
    await repo.createRequest({ userId: 'user-1', type: 'driver', notes: 'school pickup' });
    await repo.createRequest({ userId: 'user-2', type: 'escort', notes: 'night travel' });

    const history = await repo.listRequests('user-1');
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe('driver');
    expect(history[1].type).toBe('maid');
  });
});
