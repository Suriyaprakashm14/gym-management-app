export type Role = 'gym_owner' | 'manager' | 'staff' | string;

export interface DashboardUser {
  id: string;
  role: Role;
  gymId?: string;
  branchId?: string;
}

export interface KpiSummary {
  /** Revenue = money actually received (paid) for the selected month only */
  revenueThisMonth: number;
  /** Pending = unpaid/pending payments for the selected month only */
  pendingAmount: number;
  /** Tracked expenses from Expenses feature (separate from revenue/pending) */
  expensesAmount: number;
  totalPayments: number;
  totalMembers: number;
  totalBranches?: number;
}

export interface AttendanceBar {
  name: string;
  count: number;
}

export interface CheckInItem {
  memberName: string;
  checkInTime: string;
  branchName?: string;
  authMethod?: string;
}

export interface OverdueItem {
  memberName: string;
  amount: number;
  membership?: string;
  dueDate?: string;
}

/** Same shape as OverdueItem; used for pending payments card */
export interface PendingMemberItem {
  memberName: string;
  amount: number;
  membership?: string;
  dueDate?: string;
}

export interface DashboardViewModel {
  kpis: KpiSummary;
  attendanceBars: AttendanceBar[];
  todayCheckIns: CheckInItem[];
  pendingMembers: PendingMemberItem[];
}
