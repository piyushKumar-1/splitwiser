import { createAsyncThunk } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import { dataRepository } from '@/data';
import type { Group, Member } from '@/shared/types';
import type { RootState } from '@/app/store';
import { emitSyncEvent } from '@/features/sync/event-builder';
import { pullEvents, pushEvents } from '@/features/sync/sync-engine';
import * as driveApi from '@/features/sync/drive-api';
import { getCurrentUser } from '@/features/sync/google-auth';
import * as sheetsApi from '@/features/sync/sheets-api';
import { setupSyncForGroup } from '@/features/sync/sync-setup';

export const fetchGroups = createAsyncThunk('groups/fetchAll', async () => {
  return dataRepository.getAllGroups();
});

export const addGroup = createAsyncThunk(
  'groups/add',
  async (data: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>, { getState }) => {
    const state = getState() as RootState;
    const email = state.auth.userEmail;
    const displayName = state.auth.userDisplayName || email || 'Me';
    const user = getCurrentUser();

    // Auto-add the logged-in user as the first member
    const members: Member[] = [...data.members];
    if (email && !members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      members.unshift({ id: nanoid(), name: displayName, email });
    }

    const group = await dataRepository.createGroup({ ...data, members, createdBy: email || undefined });
    await dataRepository.logActivity({
      groupId: group.id,
      action: 'group_created',
      description: `Created group "${group.name}"`,
      timestamp: new Date().toISOString(),
    });

    await emitSyncEvent(group.id, 'group', group.id, 'create', group, dataRepository);

    // Fire-and-forget: set up sync in the background so the group appears immediately
    if (user) {
      setupSyncForGroup(group.id, group.name).catch(() => {});
    }

    return group;
  },
);

export const editGroup = createAsyncThunk(
  'groups/edit',
  async (group: Group) => {
    const user = getCurrentUser();

    // Pull latest from sheet before editing
    await pullEvents(group.id).catch(() => {});

    // Snapshot old members before updating
    const oldGroup = await dataRepository.getGroup(group.id);
    const oldEmails = new Set(
      (oldGroup?.members ?? []).map((m) => m.email.toLowerCase()),
    );
    const newEmails = new Set(
      group.members.map((m) => m.email.toLowerCase()),
    );
    const added = [...newEmails].filter((e) => !oldEmails.has(e));
    const removed = [...oldEmails].filter((e) => !newEmails.has(e));

    // Save locally
    const updated = await dataRepository.updateGroup(group);

    // Emit sync event
    const syncEvent = await emitSyncEvent(updated.id, 'group', updated.id, 'update', updated, dataRepository);

    // Push to sheet — if this fails, roll back
    try {
      await pushEvents(updated.id);
    } catch (err) {
      if (oldGroup) {
        await dataRepository.updateGroup(oldGroup).catch(() => {});
      }
      if (syncEvent) {
        await dataRepository.deleteSyncEvent(syncEvent.id).catch(() => {});
      }
      throw new Error(`Sync to sheet failed: ${(err as Error).message}`);
    }

    await dataRepository.logActivity({
      groupId: updated.id,
      action: 'group_updated',
      description: `Updated group "${updated.name}"`,
      timestamp: new Date().toISOString(),
    });

    // Ensure sync is set up (idempotent — won't create duplicate sheets)
    if ((added.length > 0 || removed.length > 0) && user) {
      try {
        await setupSyncForGroup(updated.id, updated.name);
      } catch {
        // Non-blocking: sharing failure shouldn't block the edit
      }
    }

    const meta = await dataRepository.getSyncMeta(group.id);

    // Update members sheet and sharing permissions
    if (meta?.spreadsheetId && meta.syncEnabled) {
      // Update members sheet tab
      if (added.length > 0 || removed.length > 0) {
        sheetsApi.writeMembersToSheet(meta.spreadsheetId, updated.members).catch(() => {});
      }

      // Share with newly added members
      if (added.length > 0) {
        await Promise.allSettled(
          added.map((email) =>
            driveApi.shareWithUser(meta.spreadsheetId, email, 'writer'),
          ),
        );
      }

      // Revoke access for removed members
      if (removed.length > 0) {
        try {
          const permissions = await driveApi.listPermissions(meta.spreadsheetId);
          for (const email of removed) {
            const perm = permissions.find(
              (p) => p.emailAddress?.toLowerCase() === email,
            );
            if (perm) {
              await driveApi.revokePermission(meta.spreadsheetId, perm.id);
            }
          }
        } catch {
          // Non-blocking
        }
      }
    }

    return updated;
  },
);

export const removeGroup = createAsyncThunk(
  'groups/remove',
  async (id: string) => {
    const meta = await dataRepository.getSyncMeta(id);

    // Push the delete event to the sheet FIRST so other members receive it
    await emitSyncEvent(id, 'group', id, 'delete', {}, dataRepository);
    if (meta?.spreadsheetId && meta.syncEnabled) {
      try {
        await pushEvents(id);
      } catch {
        // Non-blocking: push failure shouldn't prevent local deletion
      }
    }

    // Now delete the Google Sheet
    if (meta?.spreadsheetId) {
      try {
        await driveApi.deleteFile(meta.spreadsheetId);
      } catch {
        // Non-blocking: sheet deletion failure shouldn't prevent local deletion
      }
      await dataRepository.deleteSyncMeta(id);
    }

    await dataRepository.deleteGroup(id);
    return id;
  },
);
