const AUTH_KEY = 'splitwiser_auth';

interface PersistedAuth {
  email: string;
  name: string;
  accessToken: string;
  expiresAt: number;
}

export function persistAuth(
  email: string,
  name: string,
  accessToken: string,
  expiresAt: number,
): void {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ email, name, accessToken, expiresAt }),
  );
}

export function getPersistedAuth(): PersistedAuth | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPersistedAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
