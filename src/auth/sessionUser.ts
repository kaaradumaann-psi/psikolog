import type { AuthenticatedUser } from './authTypes';

let current: AuthenticatedUser | null = null;

export function setSessionUser(user: AuthenticatedUser | null): void {
  current = user;
}

export function getSessionUser(): AuthenticatedUser | null {
  return current;
}
