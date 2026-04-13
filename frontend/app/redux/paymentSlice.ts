import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../utils/api';
import axiosClient from './axiosClient';

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

export interface OverdueMember {
  memberId: string;
  memberName: string;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  membership: string;
  branchId?: string;
  branchName?: string;
}

interface PaymentState {
  payments: Payment[];
  recentPayments: Payment[];
  overduePayments: Payment[];
  overdueMembers: OverdueMember[];
  stats: PaymentStats | null;
  loading: boolean;
  createLoading: boolean;
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
  overdueMembers: [],
  stats: null,
  loading: false,
  createLoading: false,
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
        role === 'gym_owner'
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

export const fetchOverdueMembersAsync = createAsyncThunk(
  'payments/fetchOverdueMembers',
  async (
    { role, branchId }: { role: string; branchId?: string },
    { rejectWithValue }
  ) => {
    try {
      if (role === 'gym_owner') {
        const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        const response = await axiosClient.get(`/payments/analytics/overdue/gym-owner${query}`);
        const data = response.data?.data ?? response.data;
        const list: OverdueMember[] = [];
        if (Array.isArray(data?.branches)) {
          data.branches.forEach((branch: any) => {
            if (Array.isArray(branch?.overdueMembersList)) {
              branch.overdueMembersList.forEach((member: any) => {
                list.push({
                  memberId: member.memberId,
                  memberName: member.memberName,
                  totalAmount: member.totalAmount,
                  paidAmount: member.paidAmount,
                  overdueAmount: member.overdueAmount,
                  membership: member.membership,
                  branchId: branch.branchId || branch._id,
                  branchName: branch.branchName,
                });
              });
            }
          });
        }
        return list;
      }

      const response = await axiosClient.get('/payments/analytics/overdue/branch-manager');
      const data = response.data?.data ?? response.data;
      return (data?.members || data?.overdueMembers || []) as OverdueMember[];
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch pending members'));
    }
  }
);

export const createPaymentAsync = createAsyncThunk(
  'payments/createDirect',
  async (
    { branchId, memberId, paidAmount }: { branchId: string; memberId: string; paidAmount: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.post(`/payments/${branchId}`, { memberId, paidAmount });
      return (response.data?.data ?? response.data) as Payment;
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
      .addCase(fetchOverdueMembersAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOverdueMembersAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.overdueMembers = (action.payload as OverdueMember[]) || [];
      })
      .addCase(fetchOverdueMembersAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch pending members';
        state.overdueMembers = [];
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.payments.unshift(action.payload);
      })
      .addCase(createPaymentAsync.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createPaymentAsync.fulfilled, (state, action) => {
        state.createLoading = false;
        state.payments.unshift(action.payload);
      })
      .addCase(createPaymentAsync.rejected, (state, action) => {
        state.createLoading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to create payment';
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

export const selectOverdueMembers = (state: any): OverdueMember[] => state.payments?.overdueMembers ?? [];
export const selectPaymentsLoading = (state: any): boolean => state.payments?.loading ?? false;
export const selectCreatePaymentLoading = (state: any): boolean => state.payments?.createLoading ?? false;
