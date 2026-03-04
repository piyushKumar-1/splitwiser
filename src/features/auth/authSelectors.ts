import type { RootState } from '@/app/store';

export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthUserEmail = (state: RootState) => state.auth.userEmail;
export const selectAuthUserDisplayName = (state: RootState) => state.auth.userDisplayName;
