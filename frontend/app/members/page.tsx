'use client';

import MemberTable from '../components/members/MemberTable';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function MembersPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'staff']}>
      <MemberTable />
    </ProtectedRoute>
  );
}
