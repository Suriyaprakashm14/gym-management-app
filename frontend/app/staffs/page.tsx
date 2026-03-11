'use client';

import StaffContent from '../components/staffs/StaffContent';
import ProtectedRoute from '../components/auth/ProtectedRoute';

/** Only owner and manager can access /staffs. Staff role is redirected to dashboard. */
export default function StaffsPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager']} redirectPath="/dashboard">
      <StaffContent />
    </ProtectedRoute>
  );
}
