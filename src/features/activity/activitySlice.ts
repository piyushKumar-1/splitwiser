import { createSlice } from '@reduxjs/toolkit';
import type { ActivityLogEntry } from '@/shared/types';
import { fetchActivities } from './activityThunks';

interface ActivityState {
  items: ActivityLogEntry[];
  status: 'idle' | 'loading' | 'failed';
}

const initialState: ActivityState = {
  items: [],
  status: 'idle',
};

const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    clearActivities(state) {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivities.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchActivities.rejected, (state) => { state.status = 'failed'; });
  },
});

export const { clearActivities } = activitySlice.actions;
export default activitySlice.reducer;
