export type UserRole = 'ADMIN' | 'ORG_ADMIN' | 'PSYCHOLOG';

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  organizationId: string | null;
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Sistem Admin',
  ORG_ADMIN: 'Kurum Admin',
  PSYCHOLOG: 'Psikolog',
};

export const ROLE_ORDER: Record<UserRole, number> = {
  ADMIN: 0,
  ORG_ADMIN: 1,
  PSYCHOLOG: 2,
};
