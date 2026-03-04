import { createSlice } from '@reduxjs/toolkit';
import type { Expense } from '@/shared/types';
import { fetchExpenses, addExpense, editExpense, removeExpense } from './expensesThunks';

interface ExpensesState {
  items: Expense[];
  status: 'idle' | 'loading' | 'failed';
}

const initialState: ExpensesState = {
  items: [],
  status: 'idle',
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearExpenses(state) {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state) => { state.status = 'failed'; })

      .addCase(addExpense.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      .addCase(editExpense.fulfilled, (state, action) => {
        const idx = state.items.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(removeExpense.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e.id !== action.payload);
      });
  },
});

export const { clearExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
