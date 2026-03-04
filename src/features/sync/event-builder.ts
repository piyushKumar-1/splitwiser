import type { SyncEvent } from './types';
import { getCurrentUser } from './google-auth';
import type { IDataRepository } from '@/data/repository';

export function buildSyncEvent(
  groupId: string,
  entityType: SyncEvent['entityType'],
  entityId: string,
  action: SyncEvent['action'],
  entityData: unknown,
): Omit<SyncEvent, 'id'> | null {
  const user = getCurrentUser();
  if (!user) return null; // not signed in — no sync event

  return {
    groupId,
    entityType,
    entityId,
    action,
    data: JSON.stringify(entityData),
    timestamp: new Date().toISOString(),
    authorEmail: user.email,
    synced: 0,
  };
}

export async function emitSyncEvent(
  groupId: string,
  entityType: SyncEvent['entityType'],
  entityId: string,
  action: SyncEvent['action'],
  entityData: unknown,
  repository: IDataRepository,
): Promise<SyncEvent | null> {
  // Check if sync is enabled for this group
  const meta = await repository.getSyncMeta(groupId);
  if (!meta?.syncEnabled) return null;

  const event = buildSyncEvent(groupId, entityType, entityId, action, entityData);
  if (!event) return null;

  return repository.createSyncEvent(event);
}
