import { dataRepository } from '@/data';
import { getCurrentUser } from './google-auth';
import * as sheetsApi from './sheets-api';
import * as driveApi from './drive-api';
import { pushExistingDataAsEvents } from './push-existing-data';
import { pushEvents } from './sync-engine';
import { store } from '@/app/store';
import { addSyncedGroupId } from './syncSlice';

/**
 * Idempotent sync setup: creates a Google Sheet for the group if one
 * doesn't already exist, stores sync meta, pushes existing data, and
 * shares the sheet with all other group members.
 *
 * Safe to call multiple times — if sync is already set up, it returns
 * the existing spreadsheetId and re-shares with current members.
 */
export async function setupSyncForGroup(
  groupId: string,
  groupName: string,
): Promise<string> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not signed in');

  // Check if sync is already set up
  const existing = await dataRepository.getSyncMeta(groupId);
  if (existing?.spreadsheetId) {
    // Sync already exists — just re-share with current members
    await shareWithCurrentMembers(existing.spreadsheetId, groupId);
    return existing.spreadsheetId;
  }

  // Create spreadsheet
  const spreadsheetId = await sheetsApi.createSpreadsheet(
    groupName,
    groupId,
    user.email,
  );

  // Store sync meta
  const now = new Date().toISOString();
  await dataRepository.upsertSyncMeta({
    groupId,
    spreadsheetId,
    lastSyncedRow: 1,
    lastSyncedAt: now,
    lastRemoteModifiedTime: now,
    ownerEmail: user.email,
    syncEnabled: true,
  });

  store.dispatch(addSyncedGroupId(groupId));

  // Write members to the members sheet tab
  const group = await dataRepository.getGroup(groupId);
  if (group) {
    await sheetsApi.writeMembersToSheet(spreadsheetId, group.members);
  }

  // Push all existing local data as initial events
  await pushExistingDataAsEvents(groupId, user.email);
  await pushEvents(groupId);

  // Share with other members
  await shareWithCurrentMembers(spreadsheetId, groupId);

  return spreadsheetId;
}

/**
 * Share the spreadsheet with all group members (except the current user).
 * Uses Promise.allSettled so one failed share doesn't block others.
 */
async function shareWithCurrentMembers(
  spreadsheetId: string,
  groupId: string,
): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;

  const group = await dataRepository.getGroup(groupId);
  if (!group) return;

  const otherMembers = group.members.filter(
    (m) => m.email.toLowerCase() !== user.email.toLowerCase(),
  );

  if (otherMembers.length === 0) return;

  await Promise.allSettled(
    otherMembers.map((m) =>
      driveApi.shareWithUser(spreadsheetId, m.email, 'writer'),
    ),
  );
}
