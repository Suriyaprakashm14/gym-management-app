import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient from './axiosClient';

interface UpdateGymPayload {
  gymId: string;
  data: {
    name?: string;
    logoUrl?: string | null;
  };
}

interface GymState {
  loading: boolean;
  logoRemoving: boolean;
  logoutLoading: boolean;
  error: string | null;
}

const initialState: GymState = {
  loading: false,
  logoRemoving: false,
  logoutLoading: false,
  error: null,
};

export const logoutAsync = createAsyncThunk<void, void>(
  'gym/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Logout failed'
      );
    }
  }
);

export const updateGymAsync = createAsyncThunk<any, UpdateGymPayload>(
  'gym/update',
  async ({ gymId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/gyms/${gymId}`, data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update gym'
      );
    }
  }
);

export const removeGymLogoAsync = createAsyncThunk<any, void>(
  'gym/removeLogo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.delete('/gyms/logo');
      return response.data?.data ?? response.data ?? null;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to remove gym logo'
      );
    }
  }
);

const gymSlice = createSlice({
  name: 'gym',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.logoutLoading = true;
        state.error = null;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.logoutLoading = false;
      })
      .addCase(logoutAsync.rejected, (state, action) => {
        state.logoutLoading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Logout failed';
      })
      .addCase(updateGymAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGymAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateGymAsync.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === 'string' ? action.payload : 'Failed to update gym';
      })
      .addCase(removeGymLogoAsync.pending, (state) => {
        state.logoRemoving = true;
        state.error = null;
      })
      .addCase(removeGymLogoAsync.fulfilled, (state) => {
        state.logoRemoving = false;
      })
      .addCase(removeGymLogoAsync.rejected, (state, action) => {
        state.logoRemoving = false;
        state.error =
          typeof action.payload === 'string' ? action.payload : 'Failed to remove gym logo';
      });
  },
});

export default gymSlice.reducer;

export const selectGymSaving = (state: any): boolean => state.gym?.loading ?? false;
export const selectGymLogoRemoving = (state: any): boolean => state.gym?.logoRemoving ?? false;
export const selectLogoutLoading = (state: any): boolean => state.gym?.logoutLoading ?? false;
