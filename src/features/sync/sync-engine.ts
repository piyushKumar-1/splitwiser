import { nanoid } from 'nanoid';
import { dataRepository } from '@/data';
import * as sheetsApi from './sheets-api';
import * as driveApi from './drive-api';
import { replayRemoteEvents } from './event-replayer';
import { getCurrentUser, isTokenValid, ensureValidToken } from './google-auth';
import { emitSyncEvent } from './event-builder';
import { store } from '@/app/store';
import {
  setSyncOperationStatus,
  setLastSyncAt,
  setSyncError,
  setSignedOut,
} from './syncSlice';
import { setUnauthenticated } from '@/features/auth/authSlice';
import { fetchGroups } from '@/features/groups/groupsThunks';
import { fetchExpenses } from '@/features/expenses/expensesThunks';
import { fetchSettlements } from '@/features/settlements/settlementsThunks';
import { fetchActivities } from '@/features/activity/activityThunks';
import { discoverAndAutoJoin } from './auto-discover';

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ── PUSH ─────────────────────────────────────────────────────

export async function pushEvents(groupId: string): Promise<void> {
  const meta = await dataRepository.getSyncMeta(groupId);
  if (!meta?.spreadsheetId || !meta.syncEnabled) return;

  const unsyncedEvents = await dataRepository.getUnsyncedEvents(groupId);
  if (unsyncedEvents.length === 0) return;

  store.dispatch(setSyncOperationStatus('pushing'));

  try {
    const rows = unsyncedEvents.map((e) => sheetsApi.eventToRow(e));
    await sheetsApi.appendRows(meta.spreadsheetId, 'events', rows);

    await dataRepository.markEventsSynced(unsyncedEvents.map((e) => e.id));

    const now = new Date().toISOString();
    await dataRepository.upsertSyncMeta({ ...meta, lastSyncedAt: now });

    store.dispatch(setLastSyncAt(now));
    store.dispatch(setSyncOperationStatus('idle'));
  } catch (err) {
    store.dispatch(setSyncOperationStatus('error'));
    store.dispatch(setSyncError((err as Error).message));
    throw err;
  }
}

// ── PULL ─────────────────────────────────────────────────────

export async function pullEvents(
  groupId: string,
  { force = false }: { force?: boolean } = {},
): Promise<boolean> {
  const meta = await dataRepository.getSyncMeta(groupId);
  if (!meta?.spreadsheetId || !meta.syncEnabled) return false;

  const user = getCurrentUser();
  if (!user) return false;

  // Cheap modifiedTime check via Drive API (skip when forced)
  let remoteModified: string | undefined;
  try {
    remoteModified = await driveApi.getFileModifiedTime(meta.spreadsheetId);
    if (!force && remoteModified === meta.lastRemoteModifiedTime) {
      return false; // no changes
    }
  } catch (err) {
    // If the file was deleted (by the group creator), clean up locally
    if (err instanceof Error && err.message.includes('404')) {
      await dataRepository.deleteGroup(groupId);
      await dataRepository.deleteSyncMeta(groupId);
      store.dispatch(fetchGroups());
      store.dispatch(setSyncOperationStatus('idle'));
      return true;
    }
    // Other errors: proceed to fetch anyway
  }

  store.dispatch(setSyncOperationStatus('pulling'));

  try {
    // Read new rows starting after our last known row
    const startRow = (meta.lastSyncedRow || 1) + 1;
    const rawRows = await sheetsApi.readRows(
      meta.spreadsheetId,
      'events',
      startRow,
    );

    if (rawRows.length === 0) {
      // Even if no new rows, update the modifiedTime so we don't re-check
      if (remoteModified && remoteModified !== meta.lastRemoteModifiedTime) {
        await dataRepository.upsertSyncMeta({
          ...meta,
          lastRemoteModifiedTime: remoteModified,
        });
      }
      store.dispatch(setSyncOperationStatus('idle'));
      return false;
    }

    // Parse and replay
    const events = sheetsApi.parseEventRows(rawRows);
    const changes = await replayRemoteEvents(events, user.email, dataRepository);

    // Update sync meta — fetch row count in parallel with nothing else needed
    const totalRows = await sheetsApi.getRowCount(meta.spreadsheetId, 'events');
    // Reuse remoteModified from above instead of fetching again
    const finalModified = remoteModified ?? await driveApi.getFileModifiedTime(meta.spreadsheetId);
    const now = new Date().toISOString();

    await dataRepository.upsertSyncMeta({
      ...meta,
      lastSyncedRow: totalRows,
      lastSyncedAt: now,
      lastRemoteModifiedTime: finalModified,
    });

    // Refresh Redux state for any changed entity types
    const activeGroupId = store.getState().groups.activeGroupId;

    if (changes.groupsChanged) {
      store.dispatch(fetchGroups());
    }
    if (changes.expensesChanged && activeGroupId === groupId) {
      store.dispatch(fetchExpenses(groupId));
    }
    if (changes.settlementsChanged && activeGroupId === groupId) {
      store.dispatch(fetchSettlements(groupId));
    }
    if (
      (changes.expensesChanged || changes.settlementsChanged) &&
      activeGroupId === groupId
    ) {
      store.dispatch(fetchActivities(groupId));
    }

    store.dispatch(setLastSyncAt(now));
    store.dispatch(setSyncOperationStatus('idle'));
    return true;
  } catch (err) {
    store.dispatch(setSyncOperationStatus('error'));
    store.dispatch(setSyncError((err as Error).message));
    return false;
  }
}

// ── PULL ALL GROUPS (for manual refresh) ─────────────────────

export async function pullAllGroups({ force = false }: { force?: boolean } = {}): Promise<void> {
  const allMeta = await dataRepository.getAllSyncMeta();
  const enabledGroups = allMeta.filter((m) => m.syncEnabled);
  if (enabledGroups.length === 0) return;

  // Pull all groups in parallel
  await Promise.allSettled(
    enabledGroups.map((meta) => pullEvents(meta.groupId, { force })),
  );
}

// ── POLLING ──────────────────────────────────────────────────

let pollCount = 0;

export function startPolling(intervalMs: number): void {
  if (pollTimer) return;
  pollCount = 0;
  pollTimer = setInterval(async () => {
    pollCount++;

    // Check token validity before making API calls
    if (!isTokenValid()) {
      try {
        await ensureValidToken();
      } catch {
        // Token refresh failed — user is logged out
        store.dispatch(setUnauthenticated());
        store.dispatch(setSignedOut());
        stopPolling();
        return;
      }
    }

    // Pull all groups in parallel
    await pullAllGroups();

    // Check for newly shared groups every 3rd poll cycle (~60s)
    if (pollCount % 3 === 0) {
      discoverAndAutoJoin().catch(() => {});
    }
  }, intervalMs);
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ── INITIAL SYNC (joining a shared group) ────────────────────

export async function initialSync(spreadsheetId: string): Promise<string> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');

  store.dispatch(setSyncOperationStatus('pulling'));

  // Read meta sheet to get groupId and createdBy
  const metaRows = await sheetsApi.readRows(spreadsheetId, 'meta', 1);
  const groupIdRow = metaRows.find((r) => r[0] === 'groupId');
  const groupId = groupIdRow?.[1];
  if (!groupId) throw new Error('Invalid spreadsheet: no groupId in meta');

  const createdByRow = metaRows.find((r) => r[0] === 'createdBy');
  const createdByEmail = createdByRow?.[1];

  // Read ALL event rows (skip header at row 1)
  const rawRows = await sheetsApi.readRows(spreadsheetId, 'events', 2);
  const events = sheetsApi.parseEventRows(rawRows);

  // Replay all events to reconstruct state.
  // skipSelfEvents=false: during initialSync we replay everything from scratch,
  // including our own events (we don't have them locally on a fresh device).
  await replayRemoteEvents(events, user.email, dataRepository, { skipSelfEvents: false });

  // Read members from the dedicated members sheet tab (source of truth)
  const sheetMembers = await sheetsApi.readMembersFromSheet(spreadsheetId);

  // Store sync meta FIRST — emitSyncEvent checks syncEnabled and returns null without it
  const [totalRows, remoteModified] = await Promise.all([
    sheetsApi.getRowCount(spreadsheetId, 'events'),
    driveApi.getFileModifiedTime(spreadsheetId),
  ]);
  const now = new Date().toISOString();

  await dataRepository.upsertSyncMeta({
    groupId,
    spreadsheetId,
    lastSyncedRow: totalRows,
    lastSyncedAt: now,
    lastRemoteModifiedTime: remoteModified,
    ownerEmail: createdByEmail || user.email,
    syncEnabled: true,
  });

  // Update the local group with members from the sheet.
  // If anything below fails, clean up orphaned syncMeta so discovery can retry.
  try {
    const group = await dataRepository.getGroup(groupId);
    if (group) {
      // Use sheet members if available, otherwise keep what event replay set
      const members = sheetMembers.length > 0 ? [...sheetMembers] : [...group.members];

      // Auto-add the joining user if not already a member
      const joinerInList = members.some(
        (m) => m.email.toLowerCase() === user.email.toLowerCase(),
      );
      if (!joinerInList) {
        members.push({ id: nanoid(), name: user.name, email: user.email });
      }

      const updatedGroup = {
        ...group,
        members,
        createdBy: group.createdBy || createdByEmail,
      };
      await dataRepository.bulkPutGroups([updatedGroup]);

      if (!joinerInList) {
        // Write updated members back to the sheet
        await sheetsApi.writeMembersToSheet(spreadsheetId, members);

        // Emit a group update event so other members see the new joiner
        await emitSyncEvent(groupId, 'group', groupId, 'update', updatedGroup, dataRepository);

        // Push the event to the sheet immediately
        await pushEvents(groupId);
      }
    }
  } catch (err) {
    // Clean up syncMeta so discovery can retry this spreadsheet
    await dataRepository.deleteSyncMeta(groupId).catch(() => {});
    store.dispatch(setSyncOperationStatus('idle'));
    throw err;
  }

  await store.dispatch(fetchGroups()).unwrap();
  store.dispatch(setSyncOperationStatus('idle'));

  return groupId;
}
