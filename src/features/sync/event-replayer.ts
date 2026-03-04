import type { SheetEventRow } from './types';
import type { Group, Expense, Settlement } from '@/shared/types';
import type { IDataRepository } from '@/data/repository';

export async function replayRemoteEvents(
  events: SheetEventRow[],
  selfEmail: string,
  repository: IDataRepository,
): Promise<{
  groupsChanged: boolean;
  expensesChanged: boolean;
  settlementsChanged: boolean;
}> {
  let groupsChanged = false;
  let expensesChanged = false;
  let settlementsChanged = false;

  for (const event of events) {
    // Skip our own events — we already have them locally
    if (event.authorEmail === selfEmail) continue;

    let entityData: Record<string, unknown>;
    try {
      entityData = JSON.parse(event.data);
    } catch {
      continue; // skip malformed events
    }

    switch (event.entityType) {
      case 'group': {
        await replayGroupEvent(event, entityData as Partial<Group>, repository);
        groupsChanged = true;
        break;
      }
      case 'expense': {
        await replayExpenseEvent(event, entityData as Partial<Expense>, repository);
        expensesChanged = true;
        break;
      }
      case 'settlement': {
        await replaySettlementEvent(event, entityData as Partial<Settlement>, repository);
        settlementsChanged = true;
        break;
      }
      case 'member': {
        await replayMemberEvent(event, entityData as { groupId: string; members: Group['members'] }, repository);
        groupsChanged = true;
        break;
      }
    }
  }

  return { groupsChanged, expensesChanged, settlementsChanged };
}

async function replayGroupEvent(
  event: SheetEventRow,
  data: Partial<Group>,
  repository: IDataRepository,
): Promise<void> {
  switch (event.action) {
    case 'create': {
      const existing = await repository.getGroup(event.entityId);
      if (!existing && data.name && data.members) {
        const group: Group = {
          id: event.entityId,
          name: data.name,
          members: data.members,
          createdBy: data.createdBy as string | undefined,
          createdAt: data.createdAt || event.timestamp,
          updatedAt: data.updatedAt || event.timestamp,
        };
        // Use bulkPutGroups to preserve original timestamps
        await repository.bulkPutGroups([group]);
      }
      break;
    }
    case 'update': {
      const existing = await repository.getGroup(event.entityId);
      if (existing && event.timestamp >= existing.updatedAt) {
        // Use bulkPutGroups to preserve original timestamps
        await repository.bulkPutGroups([{ ...existing, ...data, id: event.entityId } as Group]);
      }
      break;
    }
    case 'delete': {
      await repository.deleteGroup(event.entityId);
      await repository.deleteSyncMeta(event.entityId);
      break;
    }
  }
}

async function replayExpenseEvent(
  event: SheetEventRow,
  data: Partial<Expense>,
  repository: IDataRepository,
): Promise<void> {
  switch (event.action) {
    case 'create': {
      const existing = await repository.getExpense(event.entityId);
      if (!existing) {
        // Use bulkPut to preserve the original remote ID
        await repository.bulkPutExpenses([data as Expense]);
      }
      break;
    }
    case 'update': {
      const existing = await repository.getExpense(event.entityId);
      if (existing && event.timestamp >= existing.updatedAt) {
        await repository.bulkPutExpenses([{ ...existing, ...data, id: event.entityId }]);
      }
      break;
    }
    case 'delete': {
      try {
        await repository.deleteExpense(event.entityId);
      } catch {
        // Already deleted
      }
      break;
    }
  }
}

async function replaySettlementEvent(
  event: SheetEventRow,
  data: Partial<Settlement>,
  repository: IDataRepository,
): Promise<void> {
  switch (event.action) {
    case 'create': {
      // Use bulkPut to preserve the original remote ID
      if (data.id && data.groupId) {
        await repository.bulkPutSettlements([data as Settlement]);
      }
      break;
    }
    case 'delete': {
      try {
        await repository.deleteSettlement(event.entityId);
      } catch {
        // Already deleted
      }
      break;
    }
  }
}

async function replayMemberEvent(
  event: SheetEventRow,
  data: { groupId: string; members: Group['members'] },
  repository: IDataRepository,
): Promise<void> {
  const existing = await repository.getGroup(data.groupId);
  if (existing && event.timestamp >= existing.updatedAt) {
    await repository.bulkPutGroups([{
      ...existing,
      members: data.members,
    }]);
  }
}
