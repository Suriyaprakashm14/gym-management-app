'use client';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PageLoader from '../components/PageLoader';

const ExpensesContent = dynamic(
  () => import('../components/expenses/ExpensesContent'),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function ExpensesPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
      <ExpensesContent />
    </ProtectedRoute>
  );
}
