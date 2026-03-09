import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../utils/api';

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
  image?: string;
  lastVisit?: string;
  billingStatus?: string;
  billingAmount?: number | string;
  billingDate?: string;
  /** Profile image (base64 or data URL) */
  image?: string;
}

interface MembersState {
  members: Member[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: MembersState = {
  members: [],
  total: 0,
  loading: false,
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

    // create
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

    // update
    builder.addCase(updateMember.fulfilled, (state, action) => {
      const { id, member } = action.payload as { id: string; member: any };
      const normalized = normalizeMember(member ?? {}, { id });
      state.members = state.members.map((m) => (m.id === id ? { ...m, ...normalized } : m));
    });
    builder.addCase(updateMember.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Failed to update member';
    });
  },
});

export const { addMember } = membersSlice.actions;
export default membersSlice.reducer;
