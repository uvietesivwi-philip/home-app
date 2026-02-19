import { SharedAuthService } from '../../packages/firebase/auth';
import { WebRoute, guardWebRoute, getAuthStateCopy } from './auth-guard';

type Render = (target: HTMLElement, html: string) => void;

const render: Render = (target, html) => {
  target.innerHTML = html;
};

export function mountWebRouter(authService: SharedAuthService, outlet: HTMLElement, route: WebRoute) {
  authService.onAuthStateChanged(async ({ status }) => {
    if (status !== 'authenticated') {
      render(
        outlet,
        `<section data-auth-state="${status}"><p>${getAuthStateCopy(status)}</p></section>`
      );

      if (status === 'expired' || status === 'unauthorized') {
        window.history.replaceState({}, '', '/sign-in');
      }
      return;
    }

    const context = await guardWebRoute(authService, route);
    if (!context) {
      render(outlet, '<section><p>Auth screen</p></section>');
      return;
    }

    render(
      outlet,
      `<section><h1>${context.path}</h1><p>Welcome, ${context.user.email}</p><button id="signout">Sign out</button></section>`
    );

    const signOutButton = document.getElementById('signout');
    signOutButton?.addEventListener('click', async () => {
      await authService.signOut();
      window.location.assign('/sign-in');
    });
  });
}
