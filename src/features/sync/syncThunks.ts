import { createAsyncThunk } from '@reduxjs/toolkit';
import * as googleAuth from './google-auth';
import * as driveApi from './drive-api';
import * as syncEngine from './sync-engine';
import { dataRepository } from '@/data';
import {
  setSignedIn,
  setSignedOut,
  addSyncedGroupId,
  removeSyncedGroupId,
  setDiscoveredGroups,
  setSyncedGroupIds,
} from './syncSlice';
import { SYNC_POLL_INTERVAL_MS } from './constants';
import type { DiscoveredGroup } from './types';
import { setupSyncForGroup } from './sync-setup';

export const googleSignIn = createAsyncThunk(
  'sync/signIn',
  async (_, { dispatch }) => {
    await googleAuth.initGoogleAuth();
    const user = await googleAuth.signIn();
    dispatch(setSignedIn({ email: user.email, name: user.name }));

    // Load existing sync meta to populate syncedGroupIds
    const allMeta = await dataRepository.getAllSyncMeta();
    dispatch(
      setSyncedGroupIds(
        allMeta.filter((m) => m.syncEnabled).map((m) => m.groupId),
      ),
    );

    // Start polling
    syncEngine.startPolling(SYNC_POLL_INTERVAL_MS);

    return user;
  },
);

export const googleSignOut = createAsyncThunk(
  'sync/signOut',
  async (_, { dispatch }) => {
    syncEngine.stopPolling();
    googleAuth.signOut();
    dispatch(setSignedOut());
  },
);

export const enableSyncForGroup = createAsyncThunk(
  'sync/enableForGroup',
  async (
    { groupId, groupName }: { groupId: string; groupName: string },
    { dispatch },
  ) => {
    // Idempotent — won't create a duplicate sheet if one already exists
    const spreadsheetId = await setupSyncForGroup(groupId, groupName);
    dispatch(addSyncedGroupId(groupId));
    return spreadsheetId;
  },
);

export const disableSyncForGroup = createAsyncThunk(
  'sync/disableForGroup',
  async (groupId: string, { dispatch }) => {
    await dataRepository.deleteSyncMeta(groupId);
    dispatch(removeSyncedGroupId(groupId));
  },
);

export const shareGroupWithUser = createAsyncThunk(
  'sync/shareGroup',
  async ({ groupId, email }: { groupId: string; email: string }) => {
    const meta = await dataRepository.getSyncMeta(groupId);
    if (!meta?.spreadsheetId) throw new Error('Group is not synced');
    await driveApi.shareWithUser(meta.spreadsheetId, email, 'writer');
    return { groupId, email };
  },
);

export const discoverSharedGroups = createAsyncThunk(
  'sync/discover',
  async (_, { dispatch }) => {
    const files = await driveApi.discoverSharedSpreadsheets();
    const existingMeta = await dataRepository.getAllSyncMeta();

    // Build set of spreadsheet IDs that are properly synced (syncMeta + group exists).
    // Clean up orphaned syncMeta where group doesn't exist locally.
    const syncedSpreadsheetIds = new Set<string>();
    for (const meta of existingMeta) {
      const group = await dataRepository.getGroup(meta.groupId);
      if (group) {
        syncedSpreadsheetIds.add(meta.spreadsheetId);
      } else {
        await dataRepository.deleteSyncMeta(meta.groupId).catch(() => {});
      }
    }

    const newGroups: DiscoveredGroup[] = [];
    for (const file of files) {
      if (syncedSpreadsheetIds.has(file.id)) continue;

      try {
        const groupName = file.name.replace('Splitwiser: ', '');
        newGroups.push({
          spreadsheetId: file.id,
          groupName,
          ownerEmail: file.owners?.[0]?.emailAddress || 'unknown',
          sharedAt: file.modifiedTime,
        });
      } catch {
        // Skip unreadable spreadsheets
      }
    }

    dispatch(setDiscoveredGroups(newGroups));
    return newGroups;
  },
);

export const joinSharedGroup = createAsyncThunk(
  'sync/joinGroup',
  async (spreadsheetId: string, { dispatch }) => {
    const groupId = await syncEngine.initialSync(spreadsheetId);
    dispatch(addSyncedGroupId(groupId));
    return groupId;
  },
);

