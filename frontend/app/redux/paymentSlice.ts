import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../utils/api';

// Types
export interface Payment {
  _id: string;
  memberId: string;
  branchId: string;
  name?: string;
  membership?: string;
  totalAmount?: number;
  paidAmount: number;
  paidAt?: string;
  status?: 'pending' | 'completed' | 'overdue';
}

export interface PaymentStats {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  completedAmount: number;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}

interface PaymentState {
  payments: Payment[];
  recentPayments: Payment[];
  overduePayments: Payment[];
  stats: PaymentStats | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

const initialState: PaymentState = {
  payments: [],
  recentPayments: [],
  overduePayments: [],
  stats: null,
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
};

// Async Thunks
export const fetchAllPayments = createAsyncThunk(
  'payments/fetchAll',
  async (
    { gymId, branchId }: { gymId?: string; branchId?: string },
    { rejectWithValue }
  ) => {
    try {
      // Backend routes require either gymId or branchId path params.
      if (branchId) {
        const response = await api.payments.getByBranchId(branchId);
        return Array.isArray(response) ? response : [];
      }

      if (gymId) {
        const response = await api.payments.getByGymId(gymId);
        return Array.isArray(response) ? response : [];
      }

      return rejectWithValue('gymId or branchId is required to fetch payments');
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch payments'));
    }
  }
);

export const fetchPaymentStats = createAsyncThunk(
  'payments/fetchStats',
  async (
    { role }: { role: string },
    { rejectWithValue }
  ) => {
    try {
      const now = new Date();
      const params = { year: now.getFullYear() };

      const analytics =
        role === 'gym_owner' || role === 'admin'
          ? await api.payments.getGymOwnerAnalytics(params)
          : await api.payments.getBranchManagerAnalytics(params);

      // Keep backward-compatible state shape for existing UI.
      const summary = analytics?.summary || {};
      return {
        totalRevenue: summary.totalPaidAmount || 0,
        pendingAmount: summary.totalPendingAmount || 0,
        overdueAmount: 0,
        completedAmount: summary.totalPaidAmount || 0,
        monthlyRevenue: [],
      } as PaymentStats;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch payment stats'));
    }
  }
);

export const createPayment = createAsyncThunk(
  'payments/create',
  async (paymentData: {
    branchId: string;
    memberId: string;
    paidAmount: number;
  }, { rejectWithValue }) => {
    try {
      const { branchId, ...payload } = paymentData;
      const response = await api.payments.createForBranch(branchId, payload);
      return response as Payment;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to create payment'));
    }
  }
);

export const updatePayment = createAsyncThunk(
  'payments/update',
  async ({ paymentId, data }: { paymentId: string; data: Partial<Payment> }, { rejectWithValue }) => {
    try {
      // Backend route is PUT /payments/:paymentId/process.
      const response = await api.request(`/payments/${paymentId}/process`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response as Payment;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to update payment'));
    }
  }
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = (action.payload as Payment[]) || [];
        state.currentPage = 1;
        state.totalPages = 1;
        
        state.overduePayments = state.payments.filter((p) => p.status === 'overdue');
        state.recentPayments = state.payments
          .filter((p) => p.status === 'completed')
          .slice(0, 10);
      })
      .addCase(fetchAllPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch payments';
      })
      .addCase(fetchPaymentStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaymentStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchPaymentStats.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch stats';
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.payments.unshift(action.payload);
      })
      .addCase(updatePayment.fulfilled, (state, action) => {
        const index = state.payments.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
      });
  },
});

export const { clearError } = paymentSlice.actions;
export default paymentSlice.reducer;
