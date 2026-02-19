import { SharedAuthService } from '../../packages/firebase/auth';

export async function submitSignIn(authService: SharedAuthService, email: string, password: string) {
  return authService.signIn(email, password);
}

export async function submitSignUp(authService: SharedAuthService, email: string, password: string) {
  return authService.signUp(email, password);
}

export async function submitSignOut(authService: SharedAuthService) {
  await authService.signOut();
}

export async function submitResetPassword(authService: SharedAuthService, email: string) {
  await authService.resetPassword(email);
}
