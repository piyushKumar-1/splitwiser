import { createSlice } from '@reduxjs/toolkit';
import type { Settlement } from '@/shared/types';
import { fetchSettlements, addSettlement, removeSettlement } from './settlementsThunks';

interface SettlementsState {
  items: Settlement[];
  status: 'idle' | 'loading' | 'failed';
}

const initialState: SettlementsState = {
  items: [],
  status: 'idle',
};

const settlementsSlice = createSlice({
  name: 'settlements',
  initialState,
  reducers: {
    clearSettlements(state) {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettlements.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchSettlements.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchSettlements.rejected, (state) => { state.status = 'failed'; })

      .addCase(addSettlement.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      .addCase(removeSettlement.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      });
  },
});

export const { clearSettlements } = settlementsSlice.actions;
export default settlementsSlice.reducer;
