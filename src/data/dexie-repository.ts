import { nanoid } from 'nanoid';
import { db } from './db';
import type { IDataRepository } from './repository';
import type {
  Group,
  Expense,
  Settlement,
  ActivityLogEntry,
  SplitwiserExport,
} from '@/shared/types';
import type { SyncEvent, SyncMeta } from '@/features/sync/types';

export class DexieRepository implements IDataRepository {
  // ── Groups ──────────────────────────────────────────────

  async getAllGroups(): Promise<Group[]> {
    return db.groups.orderBy('createdAt').reverse().toArray();
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return db.groups.get(id);
  }

  async createGroup(data: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
    const now = new Date().toISOString();
    const group: Group = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.groups.add(group);
    return group;
  }

  async updateGroup(group: Group): Promise<Group> {
    const updated = { ...group, updatedAt: new Date().toISOString() };
    await db.groups.put(updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<void> {
    await db.transaction('rw', db.groups, db.expenses, db.settlements, db.activityLog, async () => {
      await db.expenses.where({ groupId: id }).delete();
      await db.settlements.where({ groupId: id }).delete();
      await db.activityLog.where({ groupId: id }).delete();
      await db.groups.delete(id);
    });
  }

  // ── Expenses ────────────────────────────────────────────

  async getExpensesByGroup(groupId: string): Promise<Expense[]> {
    return db.expenses.where({ groupId }).reverse().sortBy('date');
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return db.expenses.get(id);
  }

  async createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const now = new Date().toISOString();
    const expense: Expense = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.expenses.add(expense);
    return expense;
  }

  async updateExpense(expense: Expense): Promise<Expense> {
    const updated = { ...expense, updatedAt: new Date().toISOString() };
    await db.expenses.put(updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<void> {
    await db.expenses.delete(id);
  }

  // ── Settlements ─────────────────────────────────────────

  async getSettlementsByGroup(groupId: string): Promise<Settlement[]> {
    return db.settlements.where({ groupId }).reverse().sortBy('date');
  }

  async getSettlement(id: string): Promise<Settlement | undefined> {
    return db.settlements.get(id);
  }

  async createSettlement(data: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement> {
    const now = new Date().toISOString();
    const settlement: Settlement = {
      ...data,
      id: nanoid(),
      createdAt: now,
    };
    await db.settlements.add(settlement);
    return settlement;
  }

  async deleteSettlement(id: string): Promise<void> {
    await db.settlements.delete(id);
  }

  // ── Activity ────────────────────────────────────────────

  async getActivitiesByGroup(groupId: string): Promise<ActivityLogEntry[]> {
    return db.activityLog.where({ groupId }).reverse().sortBy('timestamp');
  }

  async logActivity(data: Omit<ActivityLogEntry, 'id'>): Promise<ActivityLogEntry> {
    const entry: ActivityLogEntry = { ...data, id: nanoid() };
    await db.activityLog.add(entry);
    return entry;
  }

  // ── Data Portability ────────────────────────────────────

  async exportAll(): Promise<SplitwiserExport> {
    const [groups, expenses, settlements, activityLog] = await Promise.all([
      db.groups.toArray(),
      db.expenses.toArray(),
      db.settlements.toArray(),
      db.activityLog.toArray(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { groups, expenses, settlements, activityLog },
    };
  }

  async importAll(data: SplitwiserExport): Promise<void> {
    if (data.version !== 1) {
      throw new Error(`Unsupported export version: ${data.version}`);
    }
    if (!data.data?.groups || !data.data?.expenses) {
      throw new Error('Invalid export file format');
    }

    await db.transaction('rw', db.groups, db.expenses, db.settlements, db.activityLog, async () => {
      await Promise.all([
        db.groups.clear(),
        db.expenses.clear(),
        db.settlements.clear(),
        db.activityLog.clear(),
      ]);
      await Promise.all([
        db.groups.bulkAdd(data.data.groups),
        db.expenses.bulkAdd(data.data.expenses),
        db.settlements.bulkAdd(data.data.settlements),
        db.activityLog.bulkAdd(data.data.activityLog),
      ]);
    });
  }

  // ── Sync Events ───────────────────────────────────────────

  async createSyncEvent(data: Omit<SyncEvent, 'id'>): Promise<SyncEvent> {
    const event: SyncEvent = { ...data, id: nanoid() };
    await db.syncEvents.add(event);
    return event;
  }

  async deleteSyncEvent(id: string): Promise<void> {
    await db.syncEvents.delete(id);
  }

  async getUnsyncedEvents(groupId: string): Promise<SyncEvent[]> {
    return db.syncEvents
      .where('[groupId+synced]')
      .equals([groupId, 0])
      .sortBy('timestamp');
  }

  async markEventsSynced(eventIds: string[]): Promise<void> {
    await db.syncEvents.where('id').anyOf(eventIds).modify({ synced: 1 });
  }

  // ── Sync Meta ─────────────────────────────────────────────

  async getSyncMeta(groupId: string): Promise<SyncMeta | undefined> {
    return db.syncMeta.get(groupId);
  }

  async getAllSyncMeta(): Promise<SyncMeta[]> {
    return db.syncMeta.toArray();
  }

  async upsertSyncMeta(meta: SyncMeta): Promise<void> {
    await db.syncMeta.put(meta);
  }

  async deleteSyncMeta(groupId: string): Promise<void> {
    await db.syncMeta.delete(groupId);
  }

  // ── Bulk Operations (for sync replay) ─────────────────────

  async bulkPutGroups(groups: Group[]): Promise<void> {
    await db.groups.bulkPut(groups);
  }

  async bulkPutExpenses(expenses: Expense[]): Promise<void> {
    await db.expenses.bulkPut(expenses);
  }

  async bulkPutSettlements(settlements: Settlement[]): Promise<void> {
    await db.settlements.bulkPut(settlements);
  }

  // ── Destructive ─────────────────────────────────────────────

  async clearAll(): Promise<void> {
    await db.transaction(
      'rw',
      [db.groups, db.expenses, db.settlements, db.activityLog, db.syncEvents, db.syncMeta],
      async () => {
        await db.groups.clear();
        await db.expenses.clear();
        await db.settlements.clear();
        await db.activityLog.clear();
        await db.syncEvents.clear();
        await db.syncMeta.clear();
      },
    );
  }
}
