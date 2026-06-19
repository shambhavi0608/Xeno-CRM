import { auth } from '../firebase.js';

// Helper to check if Demo Mode is active
export function isDemoMode(): boolean {
  if (auth?.currentUser) {
    return false;
  }
  return localStorage.getItem('xeno_demo_mode') === 'true';
}

// Helper to determine if we have an active, authenticated Firestore user
export function getUid(): string | null {
  if (isDemoMode()) {
    return 'demo-local-user';
  }
  return auth.currentUser ? auth.currentUser.uid : null;
}
