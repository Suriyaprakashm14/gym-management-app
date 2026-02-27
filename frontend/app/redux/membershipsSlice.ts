import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../utils/api';

export interface MembershipPrice {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: string; // e.g., monthly, yearly
  currency?: string;
  isActive?: boolean;
  type?: string; // canonical backend type (e.g., monthly)
}

interface MembershipPricesState {
  items: MembershipPrice[];
  loading: boolean;
  error: string | null;
}

const initialState: MembershipPricesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchMembershipPrices = createAsyncThunk(
  'membershipPrices/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.request('/membership-prices');
      const list: any[] = res?.items || res || [];
      return list as MembershipPrice[];
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to fetch membership prices');
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
        state.items = action.payload.map((p: any) => ({
          id: p.id || p._id,
          name: p.name,
          description: p.description,
          price: p.price,
          duration: p.duration,
          currency: p.currency || 'USD',
          isActive: p.isActive,
          type: p.type,
        }));
      }
    );
    builder.addCase(fetchMembershipPrices.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string) || 'Failed to fetch membership prices';
    });
  },
});

export default membershipsSlice.reducer;


