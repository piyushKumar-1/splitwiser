import { createAsyncThunk } from '@reduxjs/toolkit';
import { dataRepository } from '@/data';

export const fetchActivities = createAsyncThunk(
  'activity/fetchByGroup',
  async (groupId: string) => {
    return dataRepository.getActivitiesByGroup(groupId);
  },
);
