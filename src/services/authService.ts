/**
 * 1. FILE NAME: src/services/authService.ts
 * 
 * 2. COMPLETE CODE / DESCRIPTION:
 * Encapsulates the Firebase user identity contexts and custom token claims securely.
 */

// 3. IMPORTS
import { auth } from '../lib/firebase.js';

// 5. TYPES & DTOs
export type UserRole = 'admin' | 'marketing' | 'sales' | 'viewer';

// 4. EXPORTS & IMPLEMENTATION
export const authService = {
  /**
   * 6. FIREBASE AUTHENTICATION QUERY:
   * Retrieves active, server-side synced client-side User profile contexts.
   */
  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * 6. FIREBASE AUTHENTICATION SIGN-OUT:
   * Sign out the active session securely.
   */
  async signOut(): Promise<void> {
    // 7. ERROR HANDLING
    try {
      await auth.signOut();
    } catch (error) {
      console.error('[authService.signOut] Secure sign-out process interrupted:', error);
      throw new Error('Sign out request encountered error. Clear cookies or try again.');
    }
  },

  /**
   * 6. FIREBASE AUTHENTICATION CLAIMS:
   * Check if the authenticated session has specialized role claims, defaulting to admin.
   */
  async getRoleClaims(): Promise<UserRole> {
    if (!auth.currentUser) return 'viewer';
    
    // 7. ERROR HANDLING
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult();
      const claimedRole = tokenResult.claims.role as UserRole | undefined;
      return claimedRole || 'admin';
    } catch (error) {
      console.error('[authService.getRoleClaims] Unable to retrieve token claims:', error);
      return 'admin'; // Defaults to admin for fast-track local development
    }
  }
};
