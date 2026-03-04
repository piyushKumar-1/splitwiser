import type { RootState } from '@/app/store';

export const selectGroups = (state: RootState) => state.groups.items;
export const selectGroupsStatus = (state: RootState) => state.groups.status;
export const selectActiveGroupId = (state: RootState) => state.groups.activeGroupId;
export const selectActiveGroup = (state: RootState) =>
  state.groups.items.find((g) => g.id === state.groups.activeGroupId);
