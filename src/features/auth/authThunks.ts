import { createAsyncThunk } from '@reduxjs/toolkit';
import * as googleAuth from '@/features/sync/google-auth';
import * as syncEngine from '@/features/sync/sync-engine';
import { dataRepository } from '@/data';
import { setSignedIn, setSignedOut, setSyncedGroupIds } from '@/features/sync/syncSlice';
import { SYNC_POLL_INTERVAL_MS } from '@/features/sync/constants';
import { setAuthenticated, setUnauthenticated } from './authSlice';
import { clearPersistedAuth } from './auth-persistence';
import { discoverAndAutoJoin } from '@/features/sync/auto-discover';

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch }) => {
    // Restore user + token from localStorage — no popup
    const hasValidToken = googleAuth.restoreFromPersisted();
    const user = googleAuth.getCurrentUser();

    if (user) {
      // Initialize GIS library (needed for token refresh)
      await googleAuth.initGoogleAuth();

      // If token is expired, try to silently refresh it
      if (!hasValidToken) {
        try {
          await googleAuth.ensureValidToken();
        } catch {
          // Token refresh failed — user must re-login
          googleAuth.signOut();
          clearPersistedAuth();
          dispatch(setUnauthenticated());
          dispatch(setSignedOut());
          return null;
        }
      }

      // Token is valid (or was refreshed successfully)
      dispatch(setAuthenticated({ email: user.email, name: user.name }));
      dispatch(setSignedIn({ email: user.email, name: user.name }));

      // Load sync meta and start polling
      const allMeta = await dataRepository.getAllSyncMeta();
      dispatch(setSyncedGroupIds(allMeta.filter((m) => m.syncEnabled).map((m) => m.groupId)));
      syncEngine.startPolling(SYNC_POLL_INTERVAL_MS);

      // Discover and auto-join shared groups
      discoverAndAutoJoin().catch(() => {});

      return { email: user.email, name: user.name };
    }

    // No persisted auth — show login page
    dispatch(setUnauthenticated());
    return null;
  },
);

export const loginWithGoogle = createAsyncThunk(
  'auth/login',
  async (_, { dispatch }) => {
    await googleAuth.initGoogleAuth();
    const user = await googleAuth.signIn();
    dispatch(setAuthenticated({ email: user.email, name: user.name }));
    dispatch(setSignedIn({ email: user.email, name: user.name }));
    // Token is persisted inside google-auth.ts signIn()

    // Load sync meta and start polling
    const allMeta = await dataRepository.getAllSyncMeta();
    dispatch(setSyncedGroupIds(allMeta.filter((m) => m.syncEnabled).map((m) => m.groupId)));
    syncEngine.startPolling(SYNC_POLL_INTERVAL_MS);

    // Auto-discover and join shared groups (non-blocking)
    discoverAndAutoJoin().catch(() => {});

    return user;
  },
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    syncEngine.stopPolling();
    googleAuth.signOut();
    clearPersistedAuth();
    dispatch(setUnauthenticated());
    dispatch(setSignedOut());
  },
);
