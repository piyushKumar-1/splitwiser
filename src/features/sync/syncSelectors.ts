import type { RootState } from '@/app/store';

export const selectIsSignedIn = (state: RootState) => state.sync.isSignedIn;
export const selectUserEmail = (state: RootState) => state.sync.userEmail;
export const selectUserDisplayName = (state: RootState) =>
  state.sync.userDisplayName;
export const selectConnectionStatus = (state: RootState) =>
  state.sync.connectionStatus;
export const selectOperationStatus = (state: RootState) =>
  state.sync.operationStatus;
export const selectLastSyncAt = (state: RootState) => state.sync.lastSyncAt;
export const selectSyncError = (state: RootState) => state.sync.error;
export const selectSyncedGroupIds = (state: RootState) =>
  state.sync.syncedGroupIds;
export const selectIsGroupSynced = (groupId: string) => (state: RootState) =>
  state.sync.syncedGroupIds.includes(groupId);
export const selectDiscoveredGroups = (state: RootState) =>
  state.sync.discoveredGroups;
