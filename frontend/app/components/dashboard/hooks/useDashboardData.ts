'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../utils/api';
import {
  AttendanceBar,
  CheckInItem,
  DashboardUser,
  DashboardViewModel,
  KpiSummary,
  OverdueItem,
} from '../types';

const EMPTY_KPIS: KpiSummary = {
  revenueThisMonth: 0,
  pendingAmount: 0,
  overdueAmount: 0,
  totalPayments: 0,
  totalMembers: 0,
  totalBranches: 0,
};

const EMPTY_MODEL: DashboardViewModel = {
  kpis: EMPTY_KPIS,
  attendanceBars: [],
  todayCheckIns: [],
  overdueMembers: [],
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

function parseOverdue(payload: unknown): { total: number; members: OverdueItem[] } {
  const data = payload as
    | {
        gymSummary?: { totalOverdueAmount?: number };
        summary?: { totalOverdueAmount?: number };
        totalOverdueAmount?: number;
        topOverdueMembers?: Array<{
          memberName?: string;
          overdueAmount?: number;
          membership?: string;
        }>;
        overdueMembers?: Array<{
          memberName?: string;
          overdueAmount?: number;
          membership?: string;
          membershipEndDate?: string;
        }>;
      }
    | undefined;

  const total =
    toNumber(data?.gymSummary?.totalOverdueAmount) ||
    toNumber(data?.summary?.totalOverdueAmount) ||
    toNumber(data?.totalOverdueAmount);

  const list = (data?.topOverdueMembers || data?.overdueMembers || []).map((item) => ({
    memberName: item.memberName || 'Unknown Member',
    amount: toNumber(item.overdueAmount),
    membership: item.membership,
    dueDate: (item as { membershipEndDate?: string }).membershipEndDate,
  }));

  return { total, members: list };
}

function parsePayments(payload: unknown): KpiSummary {
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

  return {
    revenueThisMonth: toNumber(data?.summary?.totalPaidAmount),
    pendingAmount: toNumber(data?.summary?.totalPendingAmount),
    overdueAmount: 0,
    totalPayments: toNumber(data?.summary?.totalPayments),
    totalMembers: toNumber(data?.summary?.totalMembers),
    totalBranches: Array.isArray(data?.branches) ? data?.branches.length : 0,
  };
}

export function useDashboardData(user: DashboardUser | null) {
  const [model, setModel] = useState<DashboardViewModel>(EMPTY_MODEL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        setModel(EMPTY_MODEL);
        return;
      }

      setLoading(true);
      setError(null);

      const isGymLevelRole = user.role === 'gym_owner' || user.role === 'admin';
      const paymentsPromise = isGymLevelRole
        ? api.payments.getGymOwnerAnalytics({ year: new Date().getFullYear() })
        : api.payments.getBranchManagerAnalytics({ year: new Date().getFullYear() });
      const overduePromise = isGymLevelRole
        ? api.payments.getGymOwnerOverdue()
        : api.payments.getBranchManagerOverdue();

      const [paymentsRes, weeklyRes, todayRes, overdueRes] = await Promise.allSettled([
        paymentsPromise,
        api.request('/attendance/report/weekly'),
        api.attendance.getReport({ period: 'day' }),
        overduePromise,
      ]);

      if (isCancelled) return;

      const kpis =
        paymentsRes.status === 'fulfilled' && paymentsRes.value
          ? parsePayments(paymentsRes.value)
          : EMPTY_KPIS;
      const attendanceBars =
        weeklyRes.status === 'fulfilled' && weeklyRes.value
          ? parseAttendanceWeekly(weeklyRes.value)
          : [];
      const todayCheckIns =
        todayRes.status === 'fulfilled' && todayRes.value
          ? parseTodayCheckIns(todayRes.value)
          : [];
      const overdueParsed =
        overdueRes.status === 'fulfilled' && overdueRes.value
          ? parseOverdue(overdueRes.value)
          : { total: 0, members: [] as OverdueItem[] };

      const nextModel: DashboardViewModel = {
        kpis: {
          ...kpis,
          overdueAmount: overdueParsed.total,
        },
        attendanceBars,
        todayCheckIns,
        overdueMembers: overdueParsed.members,
      };

      setModel(nextModel);
      if (
        paymentsRes.status === 'rejected' &&
        weeklyRes.status === 'rejected' &&
        todayRes.status === 'rejected' &&
        overdueRes.status === 'rejected'
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
  }, [user]);

  const roleFlags = useMemo(
    () => ({
      isGymOwner: user?.role === 'gym_owner',
      isManager: user?.role === 'manager',
      isAdmin: user?.role === 'admin',
    }),
    [user?.role]
  );

  return { model, loading, error, roleFlags };
}
