import type { RootState } from '@/app/store';

export const selectExpenses = (state: RootState) => state.expenses.items;
export const selectExpensesStatus = (state: RootState) => state.expenses.status;
