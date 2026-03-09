'use client';

import StaffContent from '../components/staffs/StaffContent';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function StaffsPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
      <StaffContent />
    </ProtectedRoute>
  );
}
