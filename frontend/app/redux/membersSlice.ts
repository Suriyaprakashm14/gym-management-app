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
  lastVisit?: string;
  billingStatus?: string;
  billingAmount?: string;
  billingDate?: string;
}

interface MembersState {
  members: Member[];
  loading: boolean;
  error: string | null;
}

const initialState: MembersState = {
  members: [],
  loading: false,
  error: null,
};

// Thunks
export const fetchMembers = createAsyncThunk(
  'members/fetchAll',
  async (params: Record<string, string | number> | undefined, { rejectWithValue }) => {
    try {
      const res = await api.members.getAll(params);
      // API shape: usually a plain array; also tolerate { data: [] } or { members: [] }
      const listSource: any =
        Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : Array.isArray((res as any)?.members)
              ? (res as any).members
              : [];
      const list: any[] = Array.isArray(listSource) ? listSource : [];

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[members] fetchMembers resolved', { count: list.length });
      }
      return list as Member[];
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
  reducers: {},
  extraReducers: (builder) => {
    // fetch
    builder.addCase(fetchMembers.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMembers.fulfilled, (state, action: PayloadAction<Member[]>) => {
      state.loading = false;
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      state.members = incoming.map((m: any) => ({
        id: m.id || m._id,
        name: m.name || [m.firstName, m.lastName].filter(Boolean).join(' '),
        firstName: m.firstName, // Preserve original firstName
        lastName: m.lastName,   // Preserve original lastName
        email: m.email,
        phone: m.profile?.phone || m.phone,
        age: m.profile?.age || m.age,
        gender: m.profile?.gender || m.gender,
        role: m.role,
        branchId: m.branchId,
        image: m.image,
        dob: m.profile?.dateOfBirth || m.dateOfBirth,
        status: m.status || (m.membership?.isActive ? 'active' : 'inactive'),
        membership: m.membership?.type,
        expires: m.membership?.endDate,
        lastVisit: m.lastVisit,
        billingStatus: m.billingStatus,
        billingAmount: m.billingAmount,
        billingDate: m.billingDate,
      }));
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
      state.members.unshift({
        id: m.id || (m as any)._id,
        name: m.name || [m.firstName, m.lastName].filter(Boolean).join(' '),
        email: m.email,
        phone: m.profile?.phone || m.phone,
        age: m.age,
        dob: m.profile?.dateOfBirth || m.dateOfBirth,
        status: m.status || (m.membership?.isActive ? 'active' : 'inactive'),
        membership: m.membership?.type,
        expires: m.membership?.endDate,
        lastVisit: m.lastVisit,
        billingStatus: m.billingStatus,
        billingAmount: m.billingAmount,
        billingDate: m.billingDate,
      });
    });
    builder.addCase(createMember.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Failed to create member';
    });

    // update
    builder.addCase(updateMember.fulfilled, (state, action) => {
      const { id, member } = action.payload as { id: string; member: any };
      state.members = state.members.map((m) =>
        m.id === id
          ? {
              ...m,
              ...{
                name: member.name || [member.firstName, member.lastName].filter(Boolean).join(' '),
                email: member.email,
                phone: member.profile?.phone || member.phone,
                age: member.age,
                dob: member.profile?.dateOfBirth || member.dateOfBirth,
                status: member.status || (member.membership?.isActive ? 'active' : 'inactive'),
                membership: member.membership?.type,
                expires: member.membership?.endDate,
                lastVisit: member.lastVisit,
                billingStatus: member.billingStatus,
                billingAmount: member.billingAmount,
                billingDate: member.billingDate,
              },
            }
          : m
      );
    });
    builder.addCase(updateMember.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Failed to update member';
    });
  },
});

export default membersSlice.reducer;
