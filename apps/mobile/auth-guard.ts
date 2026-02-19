import { AuthRequiredError, AuthStatus, SharedAuthService } from '../../packages/firebase/auth';

export type MobileScreen =
  | 'SignIn'
  | 'SignUp'
  | 'ResetPassword'
  | 'Home'
  | 'Saved'
  | 'Requests'
  | 'Profile';

const AUTH_SCREENS: MobileScreen[] = ['SignIn', 'SignUp', 'ResetPassword'];

export const isAuthScreen = (screen: MobileScreen): boolean => AUTH_SCREENS.includes(screen);

export async function guardMobileScreen(authService: SharedAuthService, screen: MobileScreen): Promise<boolean> {
  if (isAuthScreen(screen)) return true;

  try {
    await authService.requireAuth();
    return true;
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return false;
    }

    throw error;
  }
}

export function getMobileAuthStateMessage(status: AuthStatus): string {
  if (status === 'loading') return 'Restoring session...';
  if (status === 'expired') return 'Session expired. Please sign in again.';
  if (status === 'unauthorized') return 'Unauthorized. Sign in required.';
  return '';
}
