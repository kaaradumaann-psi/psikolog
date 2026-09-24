import type { AuthenticatedUser } from './authTypes';

export function displayName(user: Pick<AuthenticatedUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
