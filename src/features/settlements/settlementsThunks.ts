import { createAsyncThunk } from '@reduxjs/toolkit';
import { dataRepository } from '@/data';
import type { Settlement } from '@/shared/types';
import { emitSyncEvent } from '@/features/sync/event-builder';
import { syncAfterMutation } from '@/features/sync/sync-engine';

export const fetchSettlements = createAsyncThunk(
  'settlements/fetchByGroup',
  async (groupId: string) => {
    return dataRepository.getSettlementsByGroup(groupId);
  },
);

export const addSettlement = createAsyncThunk(
  'settlements/add',
  async (data: Omit<Settlement, 'id' | 'createdAt'> & { fromName: string; toName: string }) => {
    const { fromName, toName, ...settlementData } = data;
    const settlement = await dataRepository.createSettlement(settlementData);
    await dataRepository.logActivity({
      groupId: settlement.groupId,
      action: 'settlement_added',
      description: `${fromName} paid ${toName} ${(settlement.amount / 100).toFixed(2)}`,
      timestamp: new Date().toISOString(),
    });

    await emitSyncEvent(settlement.groupId, 'settlement', settlement.id, 'create', settlement, dataRepository);
    syncAfterMutation(settlement.groupId).catch(() => {});

    return settlement;
  },
);

export const removeSettlement = createAsyncThunk(
  'settlements/remove',
  async ({ id, groupId }: { id: string; groupId: string }) => {
    await dataRepository.deleteSettlement(id);
    await dataRepository.logActivity({
      groupId,
      action: 'settlement_deleted',
      description: 'Deleted a settlement',
      timestamp: new Date().toISOString(),
    });

    await emitSyncEvent(groupId, 'settlement', id, 'delete', {}, dataRepository);
    syncAfterMutation(groupId).catch(() => {});

    return id;
  },
);
