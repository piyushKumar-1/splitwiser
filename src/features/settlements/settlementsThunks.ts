import { createAsyncThunk } from '@reduxjs/toolkit';
import { dataRepository } from '@/data';
import type { Settlement } from '@/shared/types';
import { emitSyncEvent } from '@/features/sync/event-builder';
import { pullEvents, pushEvents } from '@/features/sync/sync-engine';

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

    // Pull latest from sheet before adding
    await pullEvents(settlementData.groupId).catch(() => {});

    // Save locally
    const settlement = await dataRepository.createSettlement(settlementData);

    // Emit sync event
    const syncEvent = await emitSyncEvent(
      settlement.groupId, 'settlement', settlement.id, 'create', settlement, dataRepository,
    );

    // Push to sheet — if this fails, roll back
    try {
      await pushEvents(settlement.groupId);
    } catch (err) {
      await dataRepository.deleteSettlement(settlement.id).catch(() => {});
      if (syncEvent) {
        await dataRepository.deleteSyncEvent(syncEvent.id).catch(() => {});
      }
      throw new Error(`Sync to sheet failed: ${(err as Error).message}`);
    }

    await dataRepository.logActivity({
      groupId: settlement.groupId,
      action: 'settlement_added',
      description: `${fromName} paid ${toName} ${(settlement.amount / 100).toFixed(2)}`,
      timestamp: new Date().toISOString(),
    });

    return settlement;
  },
);

export const removeSettlement = createAsyncThunk(
  'settlements/remove',
  async ({ id, groupId }: { id: string; groupId: string }) => {
    // Pull latest from sheet before deleting
    await pullEvents(groupId).catch(() => {});

    // Capture old state for rollback
    const oldSettlement = await dataRepository.getSettlement(id);

    // Delete locally
    await dataRepository.deleteSettlement(id);

    // Emit sync event
    const syncEvent = await emitSyncEvent(groupId, 'settlement', id, 'delete', {}, dataRepository);

    // Push to sheet — if this fails, roll back
    try {
      await pushEvents(groupId);
    } catch (err) {
      if (oldSettlement) {
        await dataRepository.bulkPutSettlements([oldSettlement]).catch(() => {});
      }
      if (syncEvent) {
        await dataRepository.deleteSyncEvent(syncEvent.id).catch(() => {});
      }
      throw new Error(`Sync to sheet failed: ${(err as Error).message}`);
    }

    await dataRepository.logActivity({
      groupId,
      action: 'settlement_deleted',
      description: 'Deleted a settlement',
      timestamp: new Date().toISOString(),
    });

    return id;
  },
);
