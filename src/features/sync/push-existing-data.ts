import { dataRepository } from '@/data';
import type { SyncEvent } from './types';

/** Push all existing local entities as "create" sync events */
export async function pushExistingDataAsEvents(
  groupId: string,
  authorEmail: string,
): Promise<void> {
  const [group, expenses, settlements] = await Promise.all([
    dataRepository.getGroup(groupId),
    dataRepository.getExpensesByGroup(groupId),
    dataRepository.getSettlementsByGroup(groupId),
  ]);

  const now = new Date().toISOString();
  const events: Array<Omit<SyncEvent, 'id'>> = [];

  if (group) {
    events.push({
      groupId,
      entityType: 'group',
      entityId: groupId,
      action: 'create',
      data: JSON.stringify(group),
      timestamp: now,
      authorEmail,
      synced: 0,
    });
  }

  for (const exp of expenses) {
    events.push({
      groupId,
      entityType: 'expense',
      entityId: exp.id,
      action: 'create',
      data: JSON.stringify(exp),
      timestamp: now,
      authorEmail,
      synced: 0,
    });
  }

  for (const sett of settlements) {
    events.push({
      groupId,
      entityType: 'settlement',
      entityId: sett.id,
      action: 'create',
      data: JSON.stringify(sett),
      timestamp: now,
      authorEmail,
      synced: 0,
    });
  }

  for (const event of events) {
    await dataRepository.createSyncEvent(event);
  }
}
