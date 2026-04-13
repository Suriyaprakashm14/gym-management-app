import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient from './axiosClient';

export interface StaffRecord {
  key: string;
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  branchId: string;
  branchName?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface AssignableBranch {
  _id: string;
  name: string;
}

interface FetchStaffsResponse {
  staffs: StaffRecord[];
  assignableBranches: AssignableBranch[];
}

interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  branchId: string;
}

interface UpdateStaffPayload {
  id: string;
  data: {
    firstName?: string;
    lastName?: string;
    status?: string;
    isActive?: boolean;
    branchId?: string;
  };
}

interface UpdateStaffStatusPayload {
  userId: string;
  isActive: boolean;
}

interface ResetStaffPasswordPayload {
  userId: string;
  newPassword: string;
}

interface StaffsState {
  staffs: StaffRecord[];
  assignableBranches: AssignableBranch[];
  loading: boolean;
  saving: boolean;
  resetPasswordLoading: boolean;
  error: string | null;
}

const initialState: StaffsState = {
  staffs: [],
  assignableBranches: [],
  loading: false,
  saving: false,
  resetPasswordLoading: false,
  error: null,
};

const unwrapStaff = (value: any) => value?.staff ?? value?.user ?? value?.data ?? value;

const normalizeStaff = (input: any): StaffRecord => {
  const s = unwrapStaff(input);
  return {
    key: s._id ?? s.id ?? '',
    _id: s._id ?? s.id ?? '',
    firstName: s.firstName ?? '',
    lastName: s.lastName ?? '',
    phone: s.phone ?? '',
    role: s.role ?? 'staff',
    branchId: s.branchId ?? '',
    branchName: s.branchName ?? '—',
    status: s.status ?? 'active',
    isActive: s.isActive !== false,
    createdAt: s.createdAt ?? '',
    createdBy: s.createdBy ?? null,
  };
};

export const fetchStaffsAsync = createAsyncThunk<
  FetchStaffsResponse,
  { branchId?: string; roleFilter?: 'all' | 'staff' | 'managers' } | undefined
>(
  'staffs/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const search = new URLSearchParams();
      if (params?.branchId) {
        search.set('branchId', params.branchId);
      }
      if (params?.roleFilter && params.roleFilter !== 'all') {
        search.set('roleFilter', params.roleFilter);
      }
      const query = search.toString() ? `?${search.toString()}` : '';
      const response = await axiosClient.get(`/users/staff${query}`);
      const raw = response.data?.data ?? response.data;
      const list = Array.isArray(raw?.staffs) ? raw.staffs : [];
      const assignableBranches = Array.isArray(raw?.assignableBranches) ? raw.assignableBranches : [];
      return {
        staffs: list.map(normalizeStaff),
        assignableBranches: assignableBranches.map((b: any) => ({
          _id: b._id ?? b.id ?? '',
          name: b.name ?? 'Branch',
        })),
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load staff'
      );
    }
  }
);

export const createStaffAsync = createAsyncThunk<any, CreateStaffPayload>(
  'staffs/create',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/staffs', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.details?.message ||
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to create user'
      );
    }
  }
);

export const updateStaffAsync = createAsyncThunk<any, UpdateStaffPayload>(
  'staffs/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/staffs/${id}`, data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update staff'
      );
    }
  }
);

export const updateStaffStatusAsync = createAsyncThunk<any, UpdateStaffStatusPayload>(
  'staffs/updateStatus',
  async ({ userId, isActive }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/users/${userId}/status`, { isActive });
      return response.data?.data ?? response.data ?? { _id: userId, isActive };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update staff status'
      );
    }
  }
);

export const deleteStaffAsync = createAsyncThunk<string, string>(
  'staffs/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/staffs/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete staff'
      );
    }
  }
);

export const resetStaffPasswordAsync = createAsyncThunk<any, ResetStaffPasswordPayload>(
  'staffs/resetPassword',
  async ({ userId, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(
        `/auth/reset-user-password/${encodeURIComponent(userId)}`,
        { newPassword }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          'Failed to reset password'
      );
    }
  }
);

const staffsSlice = createSlice({
  name: 'staffs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.staffs = action.payload.staffs;
        state.assignableBranches = action.payload.assignableBranches;
      })
      .addCase(fetchStaffsAsync.rejected, (state, action) => {
        state.loading = false;
        state.staffs = [];
        state.assignableBranches = [];
        state.error =
          typeof action.payload === 'string' ? action.payload : 'Failed to load staff';
      })
      .addCase(createStaffAsync.pending, (state) => {
        state.saving = true;
      })
      .addCase(createStaffAsync.fulfilled, (state, action) => {
        state.saving = false;
        const created = normalizeStaff(action.payload ?? {});
        if (created._id) {
          state.staffs.unshift(created);
        }
      })
      .addCase(createStaffAsync.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateStaffAsync.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateStaffAsync.fulfilled, (state, action) => {
        state.saving = false;
        const updated = normalizeStaff(action.payload ?? {});
        state.staffs = state.staffs.map((staff) =>
          staff._id === updated._id ? { ...staff, ...updated } : staff
        );
      })
      .addCase(updateStaffAsync.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateStaffStatusAsync.fulfilled, (state, action) => {
        const updated = action.payload ?? {};
        const updatedId = updated._id ?? updated.id;
        state.staffs = state.staffs.map((staff) =>
          staff._id === updatedId
            ? {
                ...staff,
                isActive: updated.isActive ?? staff.isActive,
                status:
                  typeof updated.status === 'string'
                    ? updated.status
                    : updated.isActive === false
                      ? 'inactive'
                      : staff.status,
              }
            : staff
        );
      })
      .addCase(deleteStaffAsync.fulfilled, (state, action) => {
        state.staffs = state.staffs.filter((staff) => staff._id !== action.payload);
      })
      .addCase(resetStaffPasswordAsync.pending, (state) => {
        state.resetPasswordLoading = true;
      })
      .addCase(resetStaffPasswordAsync.fulfilled, (state) => {
        state.resetPasswordLoading = false;
      })
      .addCase(resetStaffPasswordAsync.rejected, (state) => {
        state.resetPasswordLoading = false;
      });
  },
});

export default staffsSlice.reducer;

export const selectStaffs = (state: any): StaffRecord[] => state.staffs?.staffs ?? [];
export const selectAssignableBranches = (state: any): AssignableBranch[] =>
  state.staffs?.assignableBranches ?? [];
export const selectStaffsLoading = (state: any): boolean => state.staffs?.loading ?? false;
export const selectStaffsSaving = (state: any): boolean => state.staffs?.saving ?? false;
export const selectResetStaffPasswordLoading = (state: any): boolean =>
  state.staffs?.resetPasswordLoading ?? false;
