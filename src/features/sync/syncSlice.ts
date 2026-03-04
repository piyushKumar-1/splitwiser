import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  SyncState,
  SyncConnectionStatus,
  SyncOperationStatus,
  DiscoveredGroup,
} from './types';

const initialState: SyncState = {
  isSignedIn: false,
  userEmail: null,
  userDisplayName: null,
  connectionStatus: 'disconnected',
  operationStatus: 'idle',
  lastSyncAt: null,
  error: null,
  syncedGroupIds: [],
  discoveredGroups: [],
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSignedIn(
      state,
      action: PayloadAction<{ email: string; name: string }>,
    ) {
      state.isSignedIn = true;
      state.userEmail = action.payload.email;
      state.userDisplayName = action.payload.name;
      state.connectionStatus = 'connected';
      state.error = null;
    },
    setSignedOut(state) {
      state.isSignedIn = false;
      state.userEmail = null;
      state.userDisplayName = null;
      state.connectionStatus = 'disconnected';
      state.operationStatus = 'idle';
    },
    setConnectionStatus(
      state,
      action: PayloadAction<SyncConnectionStatus>,
    ) {
      state.connectionStatus = action.payload;
    },
    setSyncOperationStatus(
      state,
      action: PayloadAction<SyncOperationStatus>,
    ) {
      state.operationStatus = action.payload;
    },
    setLastSyncAt(state, action: PayloadAction<string>) {
      state.lastSyncAt = action.payload;
      state.error = null;
    },
    setSyncError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    addSyncedGroupId(state, action: PayloadAction<string>) {
      if (!state.syncedGroupIds.includes(action.payload)) {
        state.syncedGroupIds.push(action.payload);
      }
    },
    removeSyncedGroupId(state, action: PayloadAction<string>) {
      state.syncedGroupIds = state.syncedGroupIds.filter(
        (id) => id !== action.payload,
      );
    },
    setSyncedGroupIds(state, action: PayloadAction<string[]>) {
      state.syncedGroupIds = action.payload;
    },
    setDiscoveredGroups(state, action: PayloadAction<DiscoveredGroup[]>) {
      state.discoveredGroups = action.payload;
    },
  },
});

export const {
  setSignedIn,
  setSignedOut,
  setConnectionStatus,
  setSyncOperationStatus,
  setLastSyncAt,
  setSyncError,
  addSyncedGroupId,
  removeSyncedGroupId,
  setSyncedGroupIds,
  setDiscoveredGroups,
} = syncSlice.actions;

export default syncSlice.reducer;
