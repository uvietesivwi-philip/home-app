import { SharedAuthService } from '../../packages/firebase/auth';

export const mobileAuthActions = {
  signIn: (authService: SharedAuthService, email: string, password: string) => authService.signIn(email, password),
  signUp: (authService: SharedAuthService, email: string, password: string) => authService.signUp(email, password),
  signOut: (authService: SharedAuthService) => authService.signOut(),
  resetPassword: (authService: SharedAuthService, email: string) => authService.resetPassword(email)
};
