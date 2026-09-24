export type UserRole = 'ADMIN' | 'PSYCHOLOG';

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin',
  PSYCHOLOG: 'Psikolog',
};
