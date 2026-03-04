import { GOOGLE_CLIENT_ID, SCOPES } from './constants';
import type { GoogleUser } from './types';
import { persistAuth, getPersistedAuth } from '@/features/auth/auth-persistence';

let currentUser: GoogleUser | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

export function initGoogleAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve();
      return;
    }
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (elapsed >= 10_000) {
        clearInterval(interval);
        reject(new Error('Google Identity Services failed to load'));
      }
    }, 100);
  });
}

function saveToken(user: GoogleUser): void {
  persistAuth(user.email, user.name, user.accessToken, user.expiresAt);
}

export function signIn(): Promise<GoogleUser> {
  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        try {
          const userInfo = await fetchUserInfo(response.access_token);
          currentUser = {
            email: userInfo.email,
            name: userInfo.name,
            accessToken: response.access_token,
            expiresAt: Date.now() + response.expires_in * 1000,
          };
          saveToken(currentUser);
          resolve(currentUser);
        } catch (err) {
          reject(err);
        }
      },
      error_callback: (err) => reject(new Error(err.message)),
    });
    // Use prompt: '' — shows consent only if user hasn't consented before
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function refreshToken(): Promise<GoogleUser> {
  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        try {
          const userInfo = await fetchUserInfo(response.access_token);
          currentUser = {
            email: userInfo.email,
            name: userInfo.name,
            accessToken: response.access_token,
            expiresAt: Date.now() + response.expires_in * 1000,
          };
          saveToken(currentUser);
          resolve(currentUser);
        } catch (err) {
          reject(err);
        }
      },
      error_callback: (err) => reject(new Error(err.message)),
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOut(): void {
  if (currentUser?.accessToken) {
    google.accounts.oauth2.revoke(currentUser.accessToken);
  }
  currentUser = null;
  tokenClient = null;
}

export function getAccessToken(): string | null {
  if (!currentUser) return null;
  // Add 60s buffer so we refresh before actual expiry
  if (Date.now() >= currentUser.expiresAt - 60_000) return null;
  return currentUser.accessToken;
}

export function getCurrentUser(): GoogleUser | null {
  return currentUser;
}

/**
 * Restore user + token from localStorage.
 * If the token is still valid, it's used directly — no popup needed.
 */
export function restoreFromPersisted(): boolean {
  const persisted = getPersistedAuth();
  if (!persisted) return false;

  currentUser = {
    email: persisted.email,
    name: persisted.name,
    accessToken: persisted.accessToken,
    expiresAt: persisted.expiresAt,
  };

  // Check if token is still valid (with 60s buffer)
  return Date.now() < persisted.expiresAt - 60_000;
}

export async function ensureValidToken(): Promise<string> {
  const token = getAccessToken();
  if (token) return token;
  // Token expired or missing — refresh via popup (brief, auto-closes)
  try {
    const user = await refreshToken();
    return user.accessToken;
  } catch {
    const user = await signIn();
    return user.accessToken;
  }
}

async function fetchUserInfo(
  accessToken: string,
): Promise<{ email: string; name: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}
