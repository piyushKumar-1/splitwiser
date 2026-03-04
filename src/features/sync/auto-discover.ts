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
    const existingSpreadsheetIds = new Set(
      existingMeta.map((m) => m.spreadsheetId),
    );

    for (const file of files) {
      if (existingSpreadsheetIds.has(file.id)) continue;

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
