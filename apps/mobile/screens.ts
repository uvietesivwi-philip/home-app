import { SharedAuthService } from '../../packages/firebase/auth';
import { MobileScreen, getMobileAuthStateMessage, guardMobileScreen } from './auth-guard';

export type ScreenState = {
  screen: MobileScreen;
  authMessage: string;
};

export function createMobileNavigator(authService: SharedAuthService, initial: MobileScreen) {
  let state: ScreenState = { screen: initial, authMessage: 'Restoring session...' };

  const listeners = new Set<(next: ScreenState) => void>();

  const notify = () => listeners.forEach((listener) => listener(state));

  authService.onAuthStateChanged(async ({ status }) => {
    state = {
      ...state,
      authMessage: getMobileAuthStateMessage(status)
    };

    if (status === 'expired' || status === 'unauthorized') {
      state = { screen: 'SignIn', authMessage: getMobileAuthStateMessage(status) };
    }

    notify();
  });

  return {
    subscribe(listener: (next: ScreenState) => void) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },

    async navigate(nextScreen: MobileScreen) {
      const allowed = await guardMobileScreen(authService, nextScreen);
      state = allowed
        ? { screen: nextScreen, authMessage: '' }
        : { screen: 'SignIn', authMessage: getMobileAuthStateMessage('unauthorized') };
      notify();
    }
  };
}
