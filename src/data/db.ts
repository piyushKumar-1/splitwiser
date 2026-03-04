import Dexie, { type EntityTable } from 'dexie';
import type { Group, Expense, Settlement, ActivityLogEntry } from '@/shared/types';
import type { SyncEvent, SyncMeta } from '@/features/sync/types';

class SplitwiserDB extends Dexie {
  groups!: EntityTable<Group, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  settlements!: EntityTable<Settlement, 'id'>;
  activityLog!: EntityTable<ActivityLogEntry, 'id'>;
  syncEvents!: EntityTable<SyncEvent, 'id'>;
  syncMeta!: EntityTable<SyncMeta, 'groupId'>;

  constructor() {
    super('SplitwiserDB');

    this.version(1).stores({
      groups: 'id, name, createdAt',
      expenses: 'id, groupId, paidById, date, category, createdAt',
      settlements: 'id, groupId, fromMemberId, toMemberId, date',
      activityLog: 'id, groupId, action, timestamp',
    });

    this.version(2).stores({
      groups: 'id, name, createdAt',
      expenses: 'id, groupId, paidById, date, category, createdAt',
      settlements: 'id, groupId, fromMemberId, toMemberId, date',
      activityLog: 'id, groupId, action, timestamp',
      syncEvents: 'id, groupId, [groupId+synced], timestamp',
      syncMeta: 'groupId',
    });
  }
}

export const db = new SplitwiserDB();
