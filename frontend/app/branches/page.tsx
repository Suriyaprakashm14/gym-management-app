'use client';

import BranchesContent from '../components/branches/BranchesContent';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function BranchesPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner']}>
      <BranchesContent />
    </ProtectedRoute>
  );
}
