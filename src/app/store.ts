import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import groupsReducer from '@/features/groups/groupsSlice';
import expensesReducer from '@/features/expenses/expensesSlice';
import settlementsReducer from '@/features/settlements/settlementsSlice';
import activityReducer from '@/features/activity/activitySlice';
import syncReducer from '@/features/sync/syncSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupsReducer,
    expenses: expensesReducer,
    settlements: settlementsReducer,
    activity: activityReducer,
    sync: syncReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
