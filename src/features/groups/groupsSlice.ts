import { createSlice } from '@reduxjs/toolkit';
import type { Group } from '@/shared/types';
import { fetchGroups, addGroup, editGroup, removeGroup } from './groupsThunks';

interface GroupsState {
  items: Group[];
  activeGroupId: string | null;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: GroupsState = {
  items: [],
  activeGroupId: null,
  status: 'idle',
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setActiveGroup(state, action) {
      state.activeGroupId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchGroups.rejected, (state) => { state.status = 'failed'; })

      .addCase(addGroup.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      .addCase(editGroup.fulfilled, (state, action) => {
        const idx = state.items.findIndex((g) => g.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(removeGroup.fulfilled, (state, action) => {
        state.items = state.items.filter((g) => g.id !== action.payload);
        if (state.activeGroupId === action.payload) state.activeGroupId = null;
      });
  },
});

export const { setActiveGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
