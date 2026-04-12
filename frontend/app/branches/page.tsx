'use client';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PageLoader from '../components/PageLoader';

const BranchesContent = dynamic(
  () => import('../components/branches/BranchesContent'),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function BranchesPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner']}>
      <BranchesContent />
    </ProtectedRoute>
  );
}
