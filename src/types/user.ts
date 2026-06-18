export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'marketing' | 'sales' | 'viewer';
  tenantId?: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}
