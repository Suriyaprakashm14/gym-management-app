import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient from './axiosClient';

// ------------------------------
// Types
// ------------------------------

export interface Branch {
  _id: string;
  name: string;
  status?: string;
  isActive?: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactInfo?: { phone?: string };
  managers?: Array<{ id: string; name: string; email?: string }>;
  memberCount?: number;
}

export interface BranchFormPayload {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: { phone: string };
}

export interface CreateManagerPayload {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  gymId: string;
  branchId: string;
}

interface BranchesState {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  deleting: boolean;
  managerSaving: boolean;
}

const initialState: BranchesState = {
  branches: [],
  loading: false,
  error: null,
  saving: false,
  deleting: false,
  managerSaving: false,
};

// ------------------------------
// Helpers
// ------------------------------

const normaliseBranches = (raw: any): Branch[] => {
  const list =
    raw?.branches ?? raw?.data?.branches ?? raw?.data ?? raw;
  if (!Array.isArray(list)) return [];
  return list.map((b: any) => {
    const managers = b.branchManagers ?? (b.branchManager ? [b.branchManager] : []);
    const managerList = Array.isArray(managers)
      ? managers.map((m: any) => ({
          id: m.id ?? m._id,
          name:
            m.name ??
            (`${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Manager'),
          email: m.email,
        }))
      : [];
    return { ...b, key: b._id, managers: managerList } as Branch;
  });
};

// ------------------------------
// Async thunks
// ------------------------------

export const fetchBranchesAsync = createAsyncThunk<Branch[], string>(
  'branches/fetchByGym',
  async (gymId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/branches/${gymId}/branches`);
      return normaliseBranches(response.data);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch branches'
      );
    }
  }
);

export const createBranchAsync = createAsyncThunk<
  Branch,
  { gymId: string; data: BranchFormPayload }
>(
  'branches/create',
  async ({ gymId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/branches/${gymId}/branches`, data);
      return (response.data?.branch ?? response.data?.data ?? response.data) as Branch;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create branch'
      );
    }
  }
);

export const updateBranchAsync = createAsyncThunk<
  Branch,
  { branchId: string; data: BranchFormPayload }
>(
  'branches/update',
  async ({ branchId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/branches/branches/${branchId}`, data);
      return (response.data?.branch ?? response.data?.data ?? response.data) as Branch;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update branch'
      );
    }
  }
);

export const deleteBranchAsync = createAsyncThunk<string, string>(
  'branches/delete',
  async (branchId, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/branches/branches/${branchId}`);
      return branchId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete branch'
      );
    }
  }
);

export const createBranchManagerAsync = createAsyncThunk<void, CreateManagerPayload>(
  'branches/createManager',
  async (payload, { rejectWithValue }) => {
    try {
      await axiosClient.post('/auth/create-manager', payload);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error?.details?.message ||
          'Failed to create manager'
      );
    }
  }
);

// ------------------------------
// Slice
// ------------------------------

const branchesSlice = createSlice({
  name: 'branches',
  initialState,
  reducers: {
    clearBranches(state) {
      state.branches = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetch
    builder
      .addCase(fetchBranchesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
      })
      .addCase(fetchBranchesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === 'string' ? action.payload : 'Failed to fetch branches';
      });

    // create
    builder
      .addCase(createBranchAsync.pending, (state) => { state.saving = true; })
      .addCase(createBranchAsync.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload?._id) state.branches.push(action.payload);
      })
      .addCase(createBranchAsync.rejected, (state) => { state.saving = false; });

    // update
    builder
      .addCase(updateBranchAsync.pending, (state) => { state.saving = true; })
      .addCase(updateBranchAsync.fulfilled, (state, action) => {
        state.saving = false;
        const idx = state.branches.findIndex((b) => b._id === action.payload?._id);
        if (idx !== -1) state.branches[idx] = { ...state.branches[idx], ...action.payload };
      })
      .addCase(updateBranchAsync.rejected, (state) => { state.saving = false; });

    // delete
    builder
      .addCase(deleteBranchAsync.pending, (state) => { state.deleting = true; })
      .addCase(deleteBranchAsync.fulfilled, (state, action) => {
        state.deleting = false;
        state.branches = state.branches.filter((b) => b._id !== action.payload);
      })
      .addCase(deleteBranchAsync.rejected, (state) => { state.deleting = false; });

    // createManager
    builder
      .addCase(createBranchManagerAsync.pending, (state) => { state.managerSaving = true; })
      .addCase(createBranchManagerAsync.fulfilled, (state) => { state.managerSaving = false; })
      .addCase(createBranchManagerAsync.rejected, (state) => { state.managerSaving = false; });
  },
});

export const { clearBranches } = branchesSlice.actions;
export default branchesSlice.reducer;

// ------------------------------
// Selectors
// ------------------------------

export const selectBranches = (state: any): Branch[] =>
  state.branches?.branches ?? [];
export const selectBranchesLoading = (state: any): boolean =>
  state.branches?.loading ?? false;
export const selectBranchesError = (state: any): string | null =>
  state.branches?.error ?? null;
export const selectBranchesSaving = (state: any): boolean =>
  state.branches?.saving ?? false;
export const selectBranchesDeleting = (state: any): boolean =>
  state.branches?.deleting ?? false;
export const selectBranchManagerSaving = (state: any): boolean =>
  state.branches?.managerSaving ?? false;
