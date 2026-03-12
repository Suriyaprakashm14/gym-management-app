'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../utils/api';
import {
  AttendanceBar,
  CheckInItem,
  DashboardUser,
  DashboardViewModel,
  KpiSummary,
  PendingMemberItem,
} from '../types';

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

  const { startDate, endDate } = getDateRangeForFilter(
    dateFilter,
    customRange?.startDate,
    customRange?.endDate
  );

  useEffect(() => {
    let isCancelled = false;

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

      // Role-aware API requests:
      // - gym_owner: full analytics (gym-level), expenses, pending across gym
      // - manager: branch analytics, branch expenses, branch pending
      // - staff: billing-only (pending for their branch), no analytics or expenses
      let paymentsPromise: Promise<unknown>;
      let pendingPromise: Promise<unknown>;
      let expensesTotalPromise: Promise<unknown>;

      if (isGymOwner) {
        paymentsPromise = api.payments.getGymOwnerAnalytics({ startDate, endDate });
        pendingPromise = api.request('/payments/pending');
        expensesTotalPromise = api.expenses.getTotal(startDate, endDate).catch(() => ({ total: 0 }));
      } else if (isManager) {
        paymentsPromise = api.payments.getBranchManagerAnalytics({ startDate, endDate });
        pendingPromise = user.branchId
          ? api.payments.getPendingByBranchId(user.branchId)
          : Promise.resolve({ members: [] });
        expensesTotalPromise = api.expenses.getTotal(startDate, endDate).catch(() => ({ total: 0 }));
      } else if (isStaff) {
        paymentsPromise = Promise.resolve(null);
        pendingPromise = user.branchId
          ? api.payments.getPendingByBranchId(user.branchId)
          : Promise.resolve({ members: [] });
        // Staff are not allowed to access expenses endpoints
        expensesTotalPromise = Promise.resolve({ total: 0 });
      } else {
        // Fallback for unexpected roles: no restricted APIs
        paymentsPromise = Promise.resolve(null);
        pendingPromise = Promise.resolve({ members: [] });
        expensesTotalPromise = Promise.resolve({ total: 0 });
      }

      const [paymentsRes, weeklyRes, todayRes, pendingRes, expensesTotalRes] = await Promise.allSettled([
        paymentsPromise,
        api.request('/attendance/report/weekly'),
        api.attendance.getReport({ period: 'day' }),
        pendingPromise,
        expensesTotalPromise,
      ]);

      if (isCancelled) return;

      const paymentsKpis =
        paymentsRes.status === 'fulfilled' && paymentsRes.value
          ? parsePayments(paymentsRes.value)
          : { ...EMPTY_KPIS, expensesAmount: 0 };
      const trackedExpensesTotal =
        expensesTotalRes.status === 'fulfilled' && expensesTotalRes.value
          ? toNumber((expensesTotalRes.value as { total?: number; data?: { total?: number } }).total ?? (expensesTotalRes.value as any).data?.total)
          : 0;
      const kpis: KpiSummary = {
        ...paymentsKpis,
        expensesAmount: trackedExpensesTotal,
      };
      const attendanceBars =
        weeklyRes.status === 'fulfilled' && weeklyRes.value
          ? parseAttendanceWeekly(weeklyRes.value)
          : [];
      const todayCheckIns =
        todayRes.status === 'fulfilled' && todayRes.value
          ? parseTodayCheckIns(todayRes.value)
          : [];
      const pendingMembers =
        pendingRes.status === 'fulfilled' && pendingRes.value
          ? parsePendingMembers(pendingRes.value)
          : [];

      const nextModel: DashboardViewModel = {
        kpis,
        attendanceBars,
        todayCheckIns,
        pendingMembers,
      };

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
      if (!isCancelled) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [user, startDate, endDate]);

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
