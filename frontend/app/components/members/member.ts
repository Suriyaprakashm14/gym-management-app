// frontend/app/components/members/member.ts

export interface Member {
  key: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  dob: string;
  trainingHours: number;
  discipline: string;
  membership: string;
  expiryInfo: string;
  lastVisit: string;
  billingAmount: string;
  billingDate: string;
  billingStatus: 'paid' | 'overdue' | 'pending';
  hasPaymentCard: boolean;
  isFamilyAccount: boolean;
  status: 'active' | 'inactive';
}

export interface MemberTableProps {
  members?: Member[];
  onEdit?: (memberId: string) => void;
  onDelete?: (memberId: string) => void;
  onSendReminder?: (memberId: string) => void;
}

export type BillingStatus = 'paid' | 'overdue' | 'pending';
export type MemberStatus = 'active' | 'inactive';