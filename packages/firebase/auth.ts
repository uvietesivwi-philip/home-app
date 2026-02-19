import {
  Auth,
  User,
  Unsubscribe,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'expired' | 'unauthorized';

export class AuthRequiredError extends Error {
  readonly code = 'auth/required';

  constructor(message = 'Authentication is required to access this resource.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export type AuthStateChange = {
  user: User | null;
  status: AuthStatus;
};

export type SharedAuthService = {
  getCurrentUser: () => User | null;
  onAuthStateChanged: (callback: (state: AuthStateChange) => void) => Unsubscribe;
  requireAuth: () => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

export function createAuthService(auth: Auth): SharedAuthService {
  return {
    getCurrentUser() {
      return auth.currentUser;
    },

    onAuthStateChanged(callback) {
      callback({ user: auth.currentUser, status: 'loading' });

      return firebaseOnAuthStateChanged(auth, (user) => {
        if (user) {
          callback({ user, status: 'authenticated' });
          return;
        }

        const wasSignedInBefore = sessionStorage.getItem('auth:wasSignedIn') === 'true';
        callback({ user: null, status: wasSignedInBefore ? 'expired' : 'unauthorized' });
      });
    },

    async requireAuth() {
      const current = auth.currentUser;
      if (current) {
        sessionStorage.setItem('auth:wasSignedIn', 'true');
        return current;
      }

      throw new AuthRequiredError();
    },

    async signIn(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      sessionStorage.setItem('auth:wasSignedIn', 'true');
      return credential.user;
    },

    async signUp(email, password) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      sessionStorage.setItem('auth:wasSignedIn', 'true');
      return credential.user;
    },

    async signOut() {
      await firebaseSignOut(auth);
    },

    async resetPassword(email) {
      await sendPasswordResetEmail(auth, email);
    }
  };
}
