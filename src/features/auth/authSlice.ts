import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  status: 'unknown' | 'checking' | 'signed_in' | 'signed_out';
  userEmail: string | null;
  userDisplayName: string | null;
}

const initialState: AuthState = {
  status: 'unknown',
  userEmail: null,
  userDisplayName: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthChecking(state) {
      state.status = 'checking';
    },
    setAuthenticated(state, action: PayloadAction<{ email: string; name: string }>) {
      state.status = 'signed_in';
      state.userEmail = action.payload.email;
      state.userDisplayName = action.payload.name;
    },
    setUnauthenticated(state) {
      state.status = 'signed_out';
      state.userEmail = null;
      state.userDisplayName = null;
    },
    clearAuth(state) {
      state.status = 'signed_out';
      state.userEmail = null;
      state.userDisplayName = null;
    },
  },
});

export const { setAuthChecking, setAuthenticated, setUnauthenticated, clearAuth } = authSlice.actions;
export default authSlice.reducer;
