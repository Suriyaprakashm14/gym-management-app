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
  activeCount?: number; // number of members with active subscription on this plan
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
      const res = await api.membershipPrices.getAll();
      // API shape: usually plain array; also tolerate { data: [] } or { items: [] }
      const listSource: any =
        Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : Array.isArray((res as any)?.items)
              ? (res as any).items
              : [];
      const list: any[] = Array.isArray(listSource) ? listSource : [];

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[membershipPrices] fetchMembershipPrices resolved', {
          count: list.length,
        });
      }
      return list as MembershipPrice[];
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[membershipPrices] fetchMembershipPrices failed', err);
      }
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
  },
});

export default membershipsSlice.reducer;


