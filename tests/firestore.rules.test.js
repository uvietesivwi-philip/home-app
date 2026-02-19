import fs from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const projectId = 'home-app-rules-test';
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080
    }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('firestore security rules', () => {
  it('enforces owner-only access on user-scoped docs', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'savedContent/save-1'), {
        userId: 'user-1',
        contentId: 'content-1',
        savedAt: new Date()
      });
    });

    const ownerDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'savedContent/save-1')));
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'savedContent/save-1'), {
        userId: 'user-1',
        contentId: 'content-1',
        savedAt: new Date()
      })
    );
  });

  it('blocks cross-user reads and writes', async () => {
    const userOneDb = testEnv.authenticatedContext('user-1').firestore();
    const userTwoDb = testEnv.authenticatedContext('user-2').firestore();

    await assertSucceeds(
      setDoc(doc(userOneDb, 'contentProgress/progress-1'), {
        userId: 'user-1',
        contentId: 'content-1',
        progressSeconds: 30,
        updatedAt: new Date()
      })
    );

    await assertFails(getDoc(doc(userTwoDb, 'contentProgress/progress-1')));
    await assertFails(
      setDoc(doc(userTwoDb, 'savedContent/save-2'), {
        userId: 'user-1',
        contentId: 'content-1',
        savedAt: new Date()
      })
    );
  });

  it('allows signed-in reads and blocks content writes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'content/content-1'), {
        title: 'Demo content',
        category: 'cook',
        createdAt: new Date()
      });
    });

    const signedInDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(getDoc(doc(signedInDb, 'content/content-1')));
    await assertFails(
      setDoc(doc(signedInDb, 'content/content-1'), {
        title: 'Mutated'
      })
    );
  });

  it('prevents deleting request documents', async () => {
    const userDb = testEnv.authenticatedContext('user-1').firestore();

    await assertSucceeds(
      setDoc(doc(userDb, 'requests/request-1'), {
        userId: 'user-1',
        type: 'maid',
        status: 'pending',
        createdAt: new Date(),
        notes: 'help needed'
      })
    );

    await assertFails(deleteDoc(doc(userDb, 'requests/request-1')));
  });
});
