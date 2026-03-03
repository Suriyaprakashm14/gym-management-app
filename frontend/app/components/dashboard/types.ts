export type Role = 'gym_owner' | 'manager' | 'admin' | string;

export interface DashboardUser {
  id: string;
  role: Role;
  gymId?: string;
  branchId?: string;
}

export interface KpiSummary {
  revenueThisMonth: number;
  pendingAmount: number;
  overdueAmount: number;
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

export interface DashboardViewModel {
  kpis: KpiSummary;
  attendanceBars: AttendanceBar[];
  todayCheckIns: CheckInItem[];
  overdueMembers: OverdueItem[];
}
