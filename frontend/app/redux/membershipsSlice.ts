import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axiosClient from './axiosClient';

export interface MembershipPrice {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: string; // e.g., monthly, yearly
  currency?: string;
  isActive?: boolean;
  type?: string; // canonical backend type (e.g., monthly)
  activeCount?: number; // number of members with active subscription on this plan
}

interface MembershipPricesState {
  items: MembershipPrice[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  createError: string | null;
  updateLoading: boolean;
  updateError: string | null;
  deleteLoading: boolean;
  deleteError: string | null;
}

const initialState: MembershipPricesState = {
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
  deleteLoading: false,
  deleteError: null,
};

export const fetchMembershipPrices = createAsyncThunk(
  'membershipPrices/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/membership-prices');
      const raw = response.data;
      const list: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
      return list as MembershipPrice[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch membership prices'
      );
    }
  }
);

export const updateMembershipPriceAsync = createAsyncThunk<
  any,
  { id: string; data: { type?: string; description?: string; isActive: boolean } }
>(
  'membershipPrices/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/membership-prices/${id}`, data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Failed to update membership'
      );
    }
  }
);

export const createMembershipPriceAsync = createAsyncThunk<
  any,
  { type: string; price: number; description: string; duration: number }
>(
  'membershipPrices/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/membership-prices', data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Failed to create membership'
      );
    }
  }
);

export const deleteMembershipPriceAsync = createAsyncThunk<
  string,
  string
>(
  'membershipPrices/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/membership-prices/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Failed to delete membership'
      );
    }
  }
);

const membershipsSlice = createSlice({
  name: 'membershipPrices',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchMembershipPrices.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      fetchMembershipPrices.fulfilled,
      (state, action: PayloadAction<MembershipPrice[]>) => {
        state.loading = false;
        state.error = null;
        const incoming = Array.isArray(action.payload) ? action.payload : [];
        state.items = incoming.map((p: any) => ({
          id: p.id || p._id,
          name: p.name || p.type,
          description: p.description,
          price: p.price,
          duration: p.duration,
          currency: p.currency || 'INR',
          isActive: p.isActive,
          type: p.type,
          activeCount: p.activeCount,
        }));
      }
    );
    builder.addCase(fetchMembershipPrices.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string) || 'Failed to fetch membership prices';
    });

    builder.addCase(createMembershipPriceAsync.pending, (state) => {
      state.createLoading = true;
      state.createError = null;
    });
    builder.addCase(createMembershipPriceAsync.fulfilled, (state, action) => {
      state.createLoading = false;
      const created: any = action.payload;
      if (!created) return;
      state.items.unshift({
        id: created.id || created._id,
        name: created.name || created.type,
        description: created.description,
        price: created.price,
        duration: created.duration,
        currency: created.currency || 'INR',
        isActive: created.isActive,
        type: created.type,
        activeCount: created.activeCount,
      });
    });
    builder.addCase(createMembershipPriceAsync.rejected, (state, action) => {
      state.createLoading = false;
      state.createError =
        typeof action.payload === 'string' ? action.payload : 'Failed to create membership';
    });

    // updateMembershipPriceAsync
    builder.addCase(updateMembershipPriceAsync.pending, (state) => {
      state.updateLoading = true;
      state.updateError = null;
    });
    builder.addCase(updateMembershipPriceAsync.fulfilled, (state, action) => {
      state.updateLoading = false;
      const updated: any = action.payload;
      if (!updated) return;
      const updatedId = updated.id || updated._id;
      state.items = state.items.map((item) => {
        const itemId = item.id;
        if (itemId !== String(updatedId)) return item;
        return {
          ...item,
          type: updated.type ?? item.type,
          name: updated.type ?? item.name,
          description: updated.description ?? item.description,
          isActive: updated.isActive ?? item.isActive,
        };
      });
    });
    builder.addCase(updateMembershipPriceAsync.rejected, (state, action) => {
      state.updateLoading = false;
      state.updateError =
        typeof action.payload === 'string' ? action.payload : 'Failed to update membership';
    });

    builder.addCase(deleteMembershipPriceAsync.pending, (state) => {
      state.deleteLoading = true;
      state.deleteError = null;
    });
    builder.addCase(deleteMembershipPriceAsync.fulfilled, (state, action) => {
      state.deleteLoading = false;
      state.items = state.items.filter((item) => item.id !== action.payload);
    });
    builder.addCase(deleteMembershipPriceAsync.rejected, (state, action) => {
      state.deleteLoading = false;
      state.deleteError =
        typeof action.payload === 'string' ? action.payload : 'Failed to delete membership';
    });
  },
});

export default membershipsSlice.reducer;

// ------------------------------
// Selectors
// ------------------------------

export const selectMembershipPrices = (state: any): MembershipPrice[] =>
  state.membershipPrices?.items ?? [];
export const selectMembershipPricesLoading = (state: any): boolean =>
  state.membershipPrices?.loading ?? false;
export const selectMembershipPricesError = (state: any): string | null =>
  state.membershipPrices?.error ?? null;
export const selectCreateMembershipLoading = (state: any): boolean =>
  state.membershipPrices?.createLoading ?? false;
export const selectCreateMembershipError = (state: any): string | null =>
  state.membershipPrices?.createError ?? null;
export const selectUpdateMembershipLoading = (state: any): boolean =>
  state.membershipPrices?.updateLoading ?? false;
export const selectUpdateMembershipError = (state: any): string | null =>
  state.membershipPrices?.updateError ?? null;
export const selectDeleteMembershipLoading = (state: any): boolean =>
  state.membershipPrices?.deleteLoading ?? false;
export const selectDeleteMembershipError = (state: any): string | null =>
  state.membershipPrices?.deleteError ?? null;
