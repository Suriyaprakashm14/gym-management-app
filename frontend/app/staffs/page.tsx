'use client';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PageLoader from '../components/PageLoader';

const StaffContent = dynamic(
  () => import('../components/staffs/StaffContent'),
  { ssr: false, loading: () => <PageLoader /> }
);

/** Only owner and manager can access /staffs. Staff role is redirected to dashboard. */
export default function StaffsPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager']} redirectPath="/dashboard">
      <StaffContent />
    </ProtectedRoute>
  );
}
