import { User } from 'firebase/auth';
import { AuthRequiredError, AuthStatus, SharedAuthService } from '../../packages/firebase/auth';

export type RouteContext = {
  path: string;
  user: User;
};

export type PublicAuthRoute = '/sign-in' | '/sign-up' | '/reset-password';
export type PrivateRoute = '/home' | '/library' | '/requests' | '/profile';
export type WebRoute = PublicAuthRoute | PrivateRoute;

const AUTH_ROUTES: PublicAuthRoute[] = ['/sign-in', '/sign-up', '/reset-password'];

export const isAuthRoute = (route: WebRoute) => AUTH_ROUTES.includes(route as PublicAuthRoute);

export async function guardWebRoute(authService: SharedAuthService, route: WebRoute): Promise<RouteContext | null> {
  if (isAuthRoute(route)) {
    return null;
  }

  try {
    const user = await authService.requireAuth();
    return { path: route, user };
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      window.location.assign('/sign-in');
      return null;
    }

    throw error;
  }
}

export function getAuthStateCopy(status: AuthStatus): string {
  if (status === 'loading') return 'Restoring your session…';
  if (status === 'expired') return 'Your session has expired. Sign in again to continue.';
  if (status === 'unauthorized') return 'Please sign in to access this page.';
  return '';
}
