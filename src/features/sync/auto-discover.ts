import * as driveApi from './drive-api';
import * as syncEngine from './sync-engine';
import { dataRepository } from '@/data';
import { store } from '@/app/store';
import { addSyncedGroupId } from './syncSlice';
import { fetchGroups } from '@/features/groups/groupsThunks';

/**
 * Discover spreadsheets shared with the current user and auto-join any
 * that aren't already synced locally. Called on login and during polling.
 */
export async function discoverAndAutoJoin(): Promise<void> {
  try {
    const files = await driveApi.discoverSharedSpreadsheets();
    const existingMeta = await dataRepository.getAllSyncMeta();

    // Build set of spreadsheet IDs that are properly synced (syncMeta + group exists).
    // Clean up orphaned syncMeta where group doesn't exist locally so we can re-join.
    const syncedSpreadsheetIds = new Set<string>();
    for (const meta of existingMeta) {
      const group = await dataRepository.getGroup(meta.groupId);
      if (group) {
        syncedSpreadsheetIds.add(meta.spreadsheetId);
      } else {
        await dataRepository.deleteSyncMeta(meta.groupId).catch(() => {});
      }
    }

    for (const file of files) {
      if (syncedSpreadsheetIds.has(file.id)) continue;

      try {
        const groupId = await syncEngine.initialSync(file.id);
        store.dispatch(addSyncedGroupId(groupId));
      } catch {
        // Skip files that fail to sync (malformed, no access, etc.)
      }
    }

    // Refresh group list if any were joined
    store.dispatch(fetchGroups());
  } catch {
    // Non-blocking: discovery failure shouldn't break the app
  }
}
