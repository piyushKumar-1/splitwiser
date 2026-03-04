import { createAsyncThunk } from '@reduxjs/toolkit';
import { dataRepository } from '@/data';
import type { Expense } from '@/shared/types';
import type { RootState } from '@/app/store';
import { emitSyncEvent } from '@/features/sync/event-builder';
import { pullEvents, pushEvents } from '@/features/sync/sync-engine';
import { diffExpenses } from './expense-diff';

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchByGroup',
  async (groupId: string) => {
    return dataRepository.getExpensesByGroup(groupId);
  },
);

export const addExpense = createAsyncThunk(
  'expenses/add',
  async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, { getState }) => {
    const state = getState() as RootState;
    const editorEmail = state.auth.userEmail ?? 'unknown';

    // Pull latest from sheet before adding
    await pullEvents(data.groupId).catch(() => {});

    // Save locally
    const expense = await dataRepository.createExpense(data);

    // Emit sync event
    const syncEvent = await emitSyncEvent(
      expense.groupId, 'expense', expense.id, 'create', expense, dataRepository,
    );

    // Push to sheet — if this fails, roll back
    try {
      await pushEvents(expense.groupId);
    } catch (err) {
      // Roll back: remove the local expense and sync event
      await dataRepository.deleteExpense(expense.id).catch(() => {});
      if (syncEvent) {
        await dataRepository.deleteSyncEvent(syncEvent.id).catch(() => {});
      }
      throw new Error(`Sync to sheet failed: ${(err as Error).message}`);
    }

    await dataRepository.logActivity({
      groupId: expense.groupId,
      action: 'expense_added',
      description: `${editorEmail} added "${expense.description}" for ${(expense.amount / 100).toFixed(2)}`,
      timestamp: new Date().toISOString(),
      metadata: { expenseId: expense.id, addedBy: editorEmail },
    });

    return expense;
  },
);

export const editExpense = createAsyncThunk(
  'expenses/edit',
  async (expense: Expense, { getState }) => {
    const state = getState() as RootState;
    const editorEmail = state.auth.userEmail ?? 'unknown';

    // Pull latest from sheet before editing
    await pullEvents(expense.groupId).catch(() => {});

    // Capture old state for rollback and diff
    const oldExpense = await dataRepository.getExpense(expense.id);

    // Save locally
    const updated = await dataRepository.updateExpense(expense);

    // Emit sync event
    const syncEvent = await emitSyncEvent(
      updated.groupId, 'expense', updated.id, 'update', updated, dataRepository,
    );

    // Push to sheet — if this fails, roll back
    try {
      await pushEvents(updated.groupId);
    } catch (err) {
      // Roll back: restore old expense and remove sync event
      if (oldExpense) {
        await dataRepository.updateExpense(oldExpense).catch(() => {});
      }
      if (syncEvent) {
        await dataRepository.deleteSyncEvent(syncEvent.id).catch(() => {});
      }
      throw new Error(`Sync to sheet failed: ${(err as Error).message}`);
    }

    // Compute diff for activity log
    const group = state.groups.items.find((g) => g.id === expense.groupId);
    const members = group?.members ?? [];
    const changes = oldExpense ? diffExpenses(oldExpense, updated, members) : [];

    const changesSummary = changes.length > 0
      ? changes.map((c) => c.label).join(', ')
      : 'no visible changes';

    await dataRepository.logActivity({
      groupId: updated.groupId,
      action: 'expense_updated',
      description: `${editorEmail} edited "${updated.description}" (${changesSummary})`,
      timestamp: new Date().toISOString(),
      metadata: { expenseId: updated.id, editedBy: editorEmail, changes },
    });

    return updated;
  },
);

export const removeExpense = createAsyncThunk(
  'expenses/remove',
  async ({ id, groupId, description }: { id: string; groupId: string; description: string }, { getState }) => {
    const state = getState() as RootState;
    const editorEmail = state.auth.userEmail ?? 'unknown';

    // Pull latest from sheet before deleting
    await pullEvents(groupId).catch(() => {});

    // Capture old state for rollback
    const oldExpense = await dataRepository.getExpense(id);

    // Delete locally
    await dataRepository.deleteExpense(id);

    // Emit sync event
    const syncEvent = await emitSyncEvent(groupId, 'expense', id, 'delete', {}, dataRepository);

    // Push to sheet — if this fails, roll back
    try {
      await pushEvents(groupId);
    } catch (err) {
      // Roll back: restore the expense and remove sync event
      if (oldExpense) {
        await dataRepository.bulkPutExpenses([oldExpense]).catch(() => {});
      }
      if (syncEvent) {
        await dataRepository.deleteSyncEvent(syncEvent.id).catch(() => {});
      }
      throw new Error(`Sync to sheet failed: ${(err as Error).message}`);
    }

    await dataRepository.logActivity({
      groupId,
      action: 'expense_deleted',
      description: `${editorEmail} deleted "${description}"`,
      timestamp: new Date().toISOString(),
      metadata: { expenseId: id, deletedBy: editorEmail },
    });

    return id;
  },
);
