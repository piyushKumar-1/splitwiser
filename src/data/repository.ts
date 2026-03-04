import type {
  Group,
  Expense,
  Settlement,
  ActivityLogEntry,
  SplitwiserExport,
} from '@/shared/types';
import type { SyncEvent, SyncMeta } from '@/features/sync/types';

export interface IDataRepository {
  // Groups
  getAllGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group>;
  updateGroup(group: Group): Promise<Group>;
  deleteGroup(id: string): Promise<void>;

  // Expenses
  getExpensesByGroup(groupId: string): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense>;
  updateExpense(expense: Expense): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  // Settlements
  getSettlementsByGroup(groupId: string): Promise<Settlement[]>;
  getSettlement(id: string): Promise<Settlement | undefined>;
  createSettlement(settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement>;
  deleteSettlement(id: string): Promise<void>;

  // Activity
  getActivitiesByGroup(groupId: string): Promise<ActivityLogEntry[]>;
  logActivity(entry: Omit<ActivityLogEntry, 'id'>): Promise<ActivityLogEntry>;

  // Data portability
  exportAll(): Promise<SplitwiserExport>;
  importAll(data: SplitwiserExport): Promise<void>;

  // Sync events
  createSyncEvent(event: Omit<SyncEvent, 'id'>): Promise<SyncEvent>;
  deleteSyncEvent(id: string): Promise<void>;
  getUnsyncedEvents(groupId: string): Promise<SyncEvent[]>;
  markEventsSynced(eventIds: string[]): Promise<void>;

  // Sync meta
  getSyncMeta(groupId: string): Promise<SyncMeta | undefined>;
  getAllSyncMeta(): Promise<SyncMeta[]>;
  upsertSyncMeta(meta: SyncMeta): Promise<void>;
  deleteSyncMeta(groupId: string): Promise<void>;

  // Bulk operations (for replaying remote sync events with original IDs)
  bulkPutGroups(groups: Group[]): Promise<void>;
  bulkPutExpenses(expenses: Expense[]): Promise<void>;
  bulkPutSettlements(settlements: Settlement[]): Promise<void>;

  // Destructive
  clearAll(): Promise<void>;
}
