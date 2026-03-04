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
      dispatch(setAuthenticated({ email: user.email, name: user.name }));
      dispatch(setSignedIn({ email: user.email, name: user.name }));

      // Initialize GIS library (needed for future token refreshes)
      await googleAuth.initGoogleAuth();

      // Load sync meta and start polling
      const allMeta = await dataRepository.getAllSyncMeta();
      dispatch(setSyncedGroupIds(allMeta.filter((m) => m.syncEnabled).map((m) => m.groupId)));
      syncEngine.startPolling(SYNC_POLL_INTERVAL_MS);

      // Only run discovery if token is still valid (avoids popup on boot)
      if (hasValidToken) {
        discoverAndAutoJoin().catch(() => {});
      }

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
