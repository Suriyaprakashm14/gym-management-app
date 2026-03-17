'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { api } from '../../../utils/api';
import {
  AttendanceBar,
  CheckInItem,
  DashboardUser,
  DashboardViewModel,
  KpiSummary,
  PendingMemberItem,
} from '../types';
import { useBranchContext } from '../../../contexts/BranchContext';

const EMPTY_KPIS: KpiSummary = {
  revenueThisMonth: 0,
  pendingAmount: 0,
  expensesAmount: 0,
  totalPayments: 0,
  totalMembers: 0,
  totalBranches: 0,
};

const EMPTY_MODEL: DashboardViewModel = {
  kpis: EMPTY_KPIS,
  attendanceBars: [],
  todayCheckIns: [],
  pendingMembers: [],
};

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseAttendanceWeekly(payload: unknown): AttendanceBar[] {
  const data = payload as
    | { dailyBreakdown?: Array<{ dayName?: string; presentCount?: number }> }
    | undefined;
  const breakdown = data?.dailyBreakdown || [];
  if (breakdown.length > 0) {
    return breakdown.map((item) => ({
      name: item.dayName || 'N/A',
      count: toNumber(item.presentCount),
    }));
  }

  return [];
}

function formatTime(value: unknown) {
  if (!value) return 'Time not available';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Time not available';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function parseTodayCheckIns(payload: unknown): CheckInItem[] {
  const data = payload as
    | {
        presentMembers?: Array<{
          firstName?: string;
          lastName?: string;
          branchName?: string;
          attendanceDetails?: Array<{ time?: string; authMethod?: string }>;
        }>;
      }
    | undefined;

  const members = data?.presentMembers || [];
  return members.map((member) => {
    const details = member.attendanceDetails || [];
    const latest = details[details.length - 1];
    return {
      memberName: [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unknown Member',
      checkInTime: formatTime(latest?.time),
      branchName: member.branchName,
      authMethod: latest?.authMethod,
    };
  });
}

function parsePendingMembers(payload: unknown): PendingMemberItem[] {
  const data = payload as { members?: Array<{ memberName?: string; pendingAmount?: number; membership?: string; membershipEndDate?: string }> } | undefined;
  const members = data?.members || [];
  return members.map((item) => ({
    memberName: item.memberName || 'Unknown',
    amount: toNumber(item.pendingAmount),
    membership: item.membership,
    dueDate: item.membershipEndDate,
  }));
}

/** Revenue = paid only; Pending = unpaid only; both for the requested period. Expenses = tracked expenses from Expenses feature (separate from revenue/pending). */
function parsePayments(payload: unknown): Omit<KpiSummary, 'expensesAmount'> {
  const data = payload as
    | {
        summary?: {
          totalPaidAmount?: number;
          totalPendingAmount?: number;
          // Some older responses may use totalPending instead of totalPendingAmount
          totalPending?: number;
          totalPayments?: number;
          totalMembers?: number;
        };
        branches?: Array<unknown>;
      }
    | undefined;

  const summary = data?.summary;
  return {
    revenueThisMonth: toNumber(summary?.totalPaidAmount),
    pendingAmount: toNumber(summary?.totalPendingAmount ?? summary?.totalPending),
    totalPayments: toNumber(summary?.totalPayments),
    totalMembers: toNumber(summary?.totalMembers),
    totalBranches: Array.isArray(data?.branches) ? data?.branches.length : 0,
  };
}

export type DashboardDateFilter = 'currentMonth' | 'last3' | 'last6' | 'last1year' | 'custom';

/** Same date-range logic as Revenue page: full month for current month, ranges for others. */
function getDateRangeForFilter(
  filter: DashboardDateFilter,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  if (filter === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let end: Date;

  if (filter === 'currentMonth') {
    // Full current month (1st to last day), same as Revenue page
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (filter === 'last3') {
    start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate(), 0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'last6') {
    start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else {
    // last1year
    start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return { startDate: startStr, endDate: endStr };
}

export function useDashboardData(user: DashboardUser | null) {
  const [model, setModel] = useState<DashboardViewModel>(EMPTY_MODEL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('currentMonth');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const { selectedBranch } = useBranchContext();
  const loadIdRef = useRef(0);

  const { startDate, endDate } = getDateRangeForFilter(
    dateFilter,
    customRange?.startDate,
    customRange?.endDate
  );

  useEffect(() => {
    let isCancelled = false;
    const thisLoadId = ++loadIdRef.current;

    async function load() {
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        setModel(EMPTY_MODEL);
        return;
      }
      if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
        setLoading(false);
        setModel(EMPTY_MODEL);
        return;
      }

      setLoading(true);
      setError(null);

      const role = user.role;
      const isGymOwner = role === 'gym_owner';
      const isManager = role === 'manager';
      const isStaff = role === 'staff';

      // For managers/staff: always use their own branch.
      // For owners: when a branch is selected in the sidebar, behave like branch manager for that branch.
      const ownerSelectedBranchId = isGymOwner && selectedBranch ? selectedBranch : undefined;
      const branchId = !isGymOwner ? user.branchId : ownerSelectedBranchId;

      // Role-aware API requests:
      // - gym_owner: full analytics (gym-level), expenses, pending across gym
      // - manager: branch analytics, branch expenses, branch pending
      // - staff: billing-only (pending for their branch), no analytics or expenses
      let paymentsPromise: Promise<unknown>;
      let pendingPromise: Promise<unknown>;
      let expensesTotalPromise: Promise<unknown>;

      const ownerBranchScoped = isGymOwner && !!ownerSelectedBranchId;

      if (isGymOwner && !ownerBranchScoped) {
        // Owner overall (all branches)
        paymentsPromise = api.payments.getGymOwnerAnalytics({ startDate, endDate });
        pendingPromise = api.request('/payments/pending');
        expensesTotalPromise = api.expenses.getTotal(startDate, endDate).catch(() => ({ total: 0 }));
      } else if (isManager || ownerBranchScoped) {
        // Manager, or owner viewing a specific branch behaves like branch manager
        const params: { startDate: string; endDate: string; branchId?: string } = { startDate, endDate };
        if (branchId) params.branchId = branchId;
        paymentsPromise = api.payments.getBranchManagerAnalytics(params);
        pendingPromise = branchId
          ? api.payments.getPendingByBranchId(branchId)
          : Promise.resolve({ members: [] });
        expensesTotalPromise = api.expenses.getTotal(startDate, endDate, branchId || undefined).catch(() => ({ total: 0 }));
      } else if (isStaff) {
        // Staff can view their branch dashboard (revenue, pending, attendance)
        paymentsPromise = api.payments.getBranchManagerAnalytics({ startDate, endDate });
        pendingPromise = branchId
          ? api.payments.getPendingByBranchId(branchId)
          : Promise.resolve({ members: [] });
        // Staff are not allowed to access expenses endpoints
        expensesTotalPromise = Promise.resolve({ total: 0 });
      } else {
        // Fallback for unexpected roles: no restricted APIs
        paymentsPromise = Promise.resolve(null);
        pendingPromise = Promise.resolve({ members: [] });
        expensesTotalPromise = Promise.resolve({ total: 0 });
      }

      const weeklyUrl = branchId
        ? `/attendance/report/weekly?branchId=${encodeURIComponent(branchId)}`
        : '/attendance/report/weekly';

      const [paymentsRes, weeklyRes, todayRes, pendingRes, expensesTotalRes] = await Promise.allSettled([
        paymentsPromise,
        api.request(weeklyUrl),
        api.attendance.getReport(branchId ? { period: 'day', branchId } : { period: 'day' }),
        pendingPromise,
        expensesTotalPromise,
      ]);

      if (isCancelled || thisLoadId !== loadIdRef.current) return;

      const paymentsPayload =
        paymentsRes.status === 'fulfilled' && paymentsRes.value && (paymentsRes.value as { success?: boolean }).success !== false
          ? paymentsRes.value
          : null;
      const paymentsKpis = paymentsPayload ? parsePayments(paymentsPayload) : { ...EMPTY_KPIS, expensesAmount: 0 };
      const trackedExpensesTotal =
        expensesTotalRes.status === 'fulfilled' && expensesTotalRes.value
          ? toNumber((expensesTotalRes.value as { total?: number; data?: { total?: number } }).total ?? (expensesTotalRes.value as any).data?.total)
          : 0;
      const kpis: KpiSummary = {
        ...paymentsKpis,
        expensesAmount: trackedExpensesTotal,
      };
      const weeklyPayload =
        weeklyRes.status === 'fulfilled' && weeklyRes.value && (weeklyRes.value as { success?: boolean }).success !== false
          ? weeklyRes.value
          : null;
      const todayPayload =
        todayRes.status === 'fulfilled' && todayRes.value && (todayRes.value as { success?: boolean }).success !== false
          ? todayRes.value
          : null;
      const pendingPayload =
        pendingRes.status === 'fulfilled' && pendingRes.value && (pendingRes.value as { success?: boolean }).success !== false
          ? pendingRes.value
          : null;
      const attendanceBars = weeklyPayload ? parseAttendanceWeekly(weeklyPayload) : [];
      const todayCheckIns = todayPayload ? parseTodayCheckIns(todayPayload) : [];
      const pendingMembers = pendingPayload ? parsePendingMembers(pendingPayload) : [];

      const nextModel: DashboardViewModel = {
        kpis,
        attendanceBars,
        todayCheckIns,
        pendingMembers,
      };

      if (thisLoadId !== loadIdRef.current) return;
      setModel(nextModel);
      if (
        paymentsRes.status === 'rejected' &&
        weeklyRes.status === 'rejected' &&
        todayRes.status === 'rejected'
      ) {
        setError('Failed to load dashboard data');
      }
      setLoading(false);
    }

    load().catch((err: unknown) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[dashboard] load() failed', err);
      }
      if (!isCancelled && thisLoadId === loadIdRef.current) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [user, startDate, endDate, selectedBranch]);

  const setFilter = (filter: DashboardDateFilter, custom?: { startDate: string; endDate: string }) => {
    setDateFilter(filter);
    if (custom) setCustomRange(custom);
    else if (filter !== 'custom') setCustomRange(null);
  };

  const roleFlags = useMemo(
    () => ({
      isGymOwner: user?.role === 'gym_owner',
      isManager: user?.role === 'manager',
      isStaff: user?.role === 'staff',
    }),
    [user?.role]
  );

  return { model, loading, error, roleFlags, dateFilter, setFilter, customRange, setCustomRange };
}
