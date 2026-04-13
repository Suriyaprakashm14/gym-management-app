import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../utils/api';
import axiosClient from './axiosClient';

export interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string; // derived for table
  email?: string;
  phone?: string;
  age?: number;
  dob?: string;
  status?: string;
  membership?: string;
  expires?: string;
  image?: string; // Profile image (base64 or data URL)
  lastVisit?: string;
  billingStatus?: string;
  billingAmount?: number | string;
  billingDate?: string;
  /** Profile image (base64 or data URL) */
}

interface MembersState {
  members: Member[];
  total: number;
  loading: boolean;
  createLoading: boolean;
  createError: string | null;
  updateLoading: boolean;
  updateError: string | null;
  renewLoading: boolean;
  deleteLoading: boolean;
  personalDetails: any | null;
  personalDetailsLoading: boolean;
  error: string | null;
}

const initialState: MembersState = {
  members: [],
  total: 0,
  loading: false,
  createLoading: false,
  createError: null,
  updateLoading: false,
  updateError: null,
  renewLoading: false,
  deleteLoading: false,
  personalDetails: null,
  personalDetailsLoading: false,
  error: null,
};

/** Normalize raw API member (and optional overlay) to store Member shape. Status comes from backend only. */
export function normalizeMember(m: any, overlay?: Partial<Member>): Member {
  const id = overlay?.id ?? m?.id ?? m?._id;
  const membershipObj = m?.membership ?? null;
  const membershipType =
    typeof membershipObj === 'string' ? membershipObj : membershipObj?.type;
  const endDate = membershipObj?.endDate ?? null;
  const expires =
    endDate != null
      ? typeof endDate === 'string'
        ? endDate
        : (endDate as Date)?.toISOString?.() ?? String(endDate)
      : '';
  const status = overlay?.status ?? (m?.status != null && m?.status !== '' ? m.status : 'active');
  return {
    id: id != null ? String(id) : '',
    firstName: overlay?.firstName ?? m?.firstName ?? '',
    lastName: overlay?.lastName ?? m?.lastName ?? '',
    name:
      overlay?.name ??
      m?.name ??
      ([m?.firstName, m?.lastName].filter(Boolean).join(' ').trim() || ''),
    email: overlay?.email ?? m?.email ?? '',
    phone: overlay?.phone ?? m?.profile?.phone ?? m?.phone ?? '',
    age: overlay?.age ?? m?.profile?.age ?? m?.age,
    dob: overlay?.dob ?? m?.profile?.dateOfBirth ?? m?.dateOfBirth ?? '',
    status,
    membership: overlay?.membership ?? membershipType ?? '',
    expires: overlay?.expires ?? expires ?? '',
    lastVisit: overlay?.lastVisit ?? m?.lastVisit ?? m?.lastVisitDate ?? '',
    billingStatus: overlay?.billingStatus ?? m?.billingStatus ?? '',
    billingAmount: overlay?.billingAmount ?? m?.billingAmount ?? '',
    billingDate: overlay?.billingDate ?? m?.billingDate ?? '',
    image: overlay?.image ?? m?.image ?? '',
  };
}

// Thunks
export const fetchMembers = createAsyncThunk(
  'members/fetchAll',
  async (params: Record<string, string | number> | undefined, { rejectWithValue }) => {
    try {
      const res = await api.members.getAll(params);
      // API shape: { list: Member[], total: number } (or wrapped in .data by envelope)
      const envelope = res as any;
      let list: any[] = [];
      let total = 0;
      if (envelope && typeof envelope === 'object') {
        const rawList =
          Array.isArray(envelope.list) ? envelope.list
            : Array.isArray(envelope?.data?.list) ? envelope.data.list
              : Array.isArray(envelope?.data) ? envelope.data
                : [];
        list = rawList;
        total =
          typeof envelope.total === 'number' ? envelope.total
            : typeof envelope?.data?.total === 'number' ? envelope.data.total
              : list.length;
      }
      if (list.length === 0 && Array.isArray(res)) {
        list = res;
        total = res.length;
      }
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[members] fetchMembers resolved', { count: list.length, total });
      }
      return { list, total };
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[members] fetchMembers failed', err);
      }
      return rejectWithValue(err?.message || 'Failed to fetch members');
    }
  }
);

export const createMember = createAsyncThunk(
  'members/create',
  async (payload: any, { rejectWithValue }) => {
    try {
      const res = await api.members.create(payload);
      return res as Member;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to create member');
    }
  }
);

// --- New thunks: call backend directly via axiosClient (no api.ts layer) ---

export const createMemberAsync = createAsyncThunk<any, FormData | Record<string, any>>(
  'members/createAsync',
  async (payload, { rejectWithValue }) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
      const response = await axiosClient.post(
        '/members',
        payload,
        isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
      );
      // Normalize envelope: { data: { member } } | { data: member } | member
      const envelope = response.data;
      const inner = envelope?.data ?? envelope;
      return inner?.member ?? inner;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create member'
      );
    }
  }
);

export const createMemberPersonalDetailsAsync = createAsyncThunk<any, Record<string, any>>(
  'members/createPersonalDetails',
  async (personalDetails, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/members-personal-details', personalDetails);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to save personal details'
      );
    }
  }
);

export const updateMember = createAsyncThunk(
  'members/update',
  async ({ id, data }: { id: string; data: Partial<Member> | FormData }, { rejectWithValue }) => {
    try {
      const res = await api.members.update(id, data);
      return { id, member: res as Member };
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to update member');
    }
  }
);

// --- Edit member thunks: call backend directly via axiosClient ---

export const fetchMemberPersonalDetailsAsync = createAsyncThunk<any, string>(
  'members/fetchPersonalDetails',
  async (memberId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/members-personal-details/member/${memberId}`);
      return response.data?.data ?? response.data ?? null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch personal details'
      );
    }
  }
);

export const updateMemberAsync = createAsyncThunk<
  any,
  { id: string; data: Record<string, any> }
>(
  'members/updateAsync',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/members/${id}`, data);
      const envelope = response.data;
      return { id, member: envelope?.data ?? envelope };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update member'
      );
    }
  }
);

export const updateMemberProfileImageAsync = createAsyncThunk<
  any,
  { id: string; formData: FormData }
>(
  'members/updateProfileImage',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(
        `/members/${id}/profile-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { id, member: response.data?.data ?? response.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update profile image'
      );
    }
  }
);

export const updateMemberPersonalDetailsAsync = createAsyncThunk<
  any,
  { memberId: string; data: Record<string, any> }
>(
  'members/updatePersonalDetails',
  async ({ memberId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(
        `/members-personal-details/member/${memberId}`,
        data
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update personal details'
      );
    }
  }
);

export const renewMemberAsync = createAsyncThunk<
  any,
  { memberId: string; data: { membership: string; planQuantity?: number; paidAmount?: number; membershipStartDate?: string } }
>(
  'members/renew',
  async ({ memberId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/members/${memberId}/renew`, data);
      return {
        memberId,
        member: response.data?.data ?? response.data,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to renew member'
      );
    }
  }
);

export const deleteMemberAsync = createAsyncThunk<string, string>(
  'members/delete',
  async (memberId, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/members/${memberId}`);
      return memberId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to remove member'
      );
    }
  }
);

const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {
    addMember(state, action: PayloadAction<Member>) {
      const member = action.payload;
      if (!member?.id) return;
      if (state.members.some((m) => m.id === member.id)) return;
      state.members.unshift(member);
    },
    clearPersonalDetails(state) {
      state.personalDetails = null;
      state.personalDetailsLoading = false;
    },
  },
  extraReducers: (builder) => {
    // fetch
    builder.addCase(fetchMembers.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMembers.fulfilled, (state, action: PayloadAction<{ list: Member[]; total: number }>) => {
      state.loading = false;
      state.error = null;
      const payload = action.payload;
      const incoming = Array.isArray(payload?.list) ? payload.list : [];
      state.members = incoming.map((m: any) => normalizeMember(m));
      state.total = typeof payload?.total === 'number' ? payload.total : state.members.length;
    });
    builder.addCase(fetchMembers.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string) || 'Failed to fetch members';
    });

    // create (legacy – via api.ts)
    builder.addCase(createMember.pending, (state) => {
      state.error = null;
    });
    builder.addCase(createMember.fulfilled, (state, action: PayloadAction<Member>) => {
      const m: any = action.payload;
      state.members.unshift(normalizeMember(m));
      state.total = Math.max(state.total, state.members.length);
    });
    builder.addCase(createMember.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Failed to create member';
    });

    // createAsync (via axiosClient directly)
    builder.addCase(createMemberAsync.pending, (state) => {
      state.createLoading = true;
      state.createError = null;
    });
    builder.addCase(createMemberAsync.fulfilled, (state, action) => {
      state.createLoading = false;
      const m: any = action.payload;
      if (m) {
        const normalized = normalizeMember(m);
        if (normalized.id && !state.members.some((x) => x.id === normalized.id)) {
          state.members.unshift(normalized);
          state.total = Math.max(state.total, state.members.length);
        }
      }
    });
    builder.addCase(createMemberAsync.rejected, (state, action) => {
      state.createLoading = false;
      state.createError =
        typeof action.payload === 'string' ? action.payload : 'Failed to create member';
    });

    // update (legacy – via api.ts)
    builder.addCase(updateMember.fulfilled, (state, action) => {
      const { id, member } = action.payload as { id: string; member: any };
      const normalized = normalizeMember(member ?? {}, { id });
      state.members = state.members.map((m) => (m.id === id ? { ...m, ...normalized } : m));
    });
    builder.addCase(updateMember.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Failed to update member';
    });

    // fetchMemberPersonalDetails
    builder.addCase(fetchMemberPersonalDetailsAsync.pending, (state) => {
      state.personalDetailsLoading = true;
    });
    builder.addCase(fetchMemberPersonalDetailsAsync.fulfilled, (state, action) => {
      state.personalDetailsLoading = false;
      state.personalDetails = action.payload;
    });
    builder.addCase(fetchMemberPersonalDetailsAsync.rejected, (state) => {
      state.personalDetailsLoading = false;
      state.personalDetails = null;
    });

    // updateMemberAsync
    builder.addCase(updateMemberAsync.pending, (state) => {
      state.updateLoading = true;
      state.updateError = null;
    });
    builder.addCase(updateMemberAsync.fulfilled, (state, action) => {
      state.updateLoading = false;
      const { id, member } = action.payload as { id: string; member: any };
      if (id && member) {
        const normalized = normalizeMember(member, { id });
        state.members = state.members.map((m) =>
          m.id === id ? { ...m, ...normalized } : m
        );
      }
    });
    builder.addCase(updateMemberAsync.rejected, (state, action) => {
      state.updateLoading = false;
      state.updateError =
        typeof action.payload === 'string' ? action.payload : 'Failed to update member';
    });

    // updateMemberProfileImage
    builder.addCase(updateMemberProfileImageAsync.pending, (state) => {
      state.updateLoading = true;
      state.updateError = null;
    });
    builder.addCase(updateMemberProfileImageAsync.fulfilled, (state, action) => {
      state.updateLoading = false;
      const { id, member } = action.payload as { id: string; member: any };
      if (id && member) {
        const normalized = normalizeMember(member, { id });
        state.members = state.members.map((m) =>
          m.id === id ? { ...m, ...normalized } : m
        );
      }
    });
    builder.addCase(updateMemberProfileImageAsync.rejected, (state, action) => {
      state.updateLoading = false;
      state.updateError =
        typeof action.payload === 'string' ? action.payload : 'Failed to update profile image';
    });

    // updateMemberPersonalDetails — side-effect only, no store change needed
    builder.addCase(updateMemberPersonalDetailsAsync.rejected, (state, action) => {
      state.updateError =
        typeof action.payload === 'string' ? action.payload : 'Failed to update personal details';
    });

    builder.addCase(renewMemberAsync.pending, (state) => {
      state.renewLoading = true;
    });
    builder.addCase(renewMemberAsync.fulfilled, (state, action) => {
      state.renewLoading = false;
      const { memberId, member } = action.payload as { memberId: string; member: any };
      if (!memberId || !member) return;
      const normalized = normalizeMember(member, { id: memberId });
      state.members = state.members.map((m) =>
        m.id === memberId ? { ...m, ...normalized } : m
      );
    });
    builder.addCase(renewMemberAsync.rejected, (state, action) => {
      state.renewLoading = false;
      state.error =
        typeof action.payload === 'string' ? action.payload : 'Failed to renew member';
    });

    builder.addCase(deleteMemberAsync.pending, (state) => {
      state.deleteLoading = true;
    });
    builder.addCase(deleteMemberAsync.fulfilled, (state, action) => {
      state.deleteLoading = false;
      state.members = state.members.filter((m) => m.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    });
    builder.addCase(deleteMemberAsync.rejected, (state, action) => {
      state.deleteLoading = false;
      state.error =
        typeof action.payload === 'string' ? action.payload : 'Failed to remove member';
    });
  },
});

export const { addMember, clearPersonalDetails } = membersSlice.actions;
export default membersSlice.reducer;

// ------------------------------
// Selectors
// ------------------------------

export const selectMembers = (state: any): Member[] => state.members?.members ?? [];
export const selectMembersTotal = (state: any): number => state.members?.total ?? 0;
export const selectMembersLoading = (state: any): boolean => state.members?.loading ?? false;
export const selectMembersError = (state: any): string | null => state.members?.error ?? null;
export const selectCreateMemberLoading = (state: any): boolean => state.members?.createLoading ?? false;
export const selectCreateMemberError = (state: any): string | null => state.members?.createError ?? null;
export const selectUpdateMemberLoading = (state: any): boolean => state.members?.updateLoading ?? false;
export const selectUpdateMemberError = (state: any): string | null => state.members?.updateError ?? null;
export const selectMemberPersonalDetails = (state: any): any | null => state.members?.personalDetails ?? null;
export const selectMemberPersonalDetailsLoading = (state: any): boolean => state.members?.personalDetailsLoading ?? false;
export const selectRenewMemberLoading = (state: any): boolean => state.members?.renewLoading ?? false;
export const selectDeleteMemberLoading = (state: any): boolean => state.members?.deleteLoading ?? false;
