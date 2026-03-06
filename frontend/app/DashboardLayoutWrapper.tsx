'use client';

import { usePathname } from 'next/navigation';
import DashboardShell from './_dashboard/DashboardShell';

const DASHBOARD_PATHS = ['/dashboard', '/members', '/branches', '/billing', '/revenue', '/expenses'];

function isDashboardPath(pathname: string) {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isDashboardPath(pathname ?? '')) {
    return <DashboardShell>{children}</DashboardShell>;
  }
  return <>{children}</>;
}
