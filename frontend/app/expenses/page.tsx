'use client';

import ExpensesContent from '../components/expenses/ExpensesContent';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function ExpensesPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
      <ExpensesContent />
    </ProtectedRoute>
  );
}
