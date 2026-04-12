'use client';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PageLoader from '../components/PageLoader';

const MemberTable = dynamic(
  () => import('../components/members/MemberTable'),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function MembersPage() {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'staff']}>
      <MemberTable />
    </ProtectedRoute>
  );
}
