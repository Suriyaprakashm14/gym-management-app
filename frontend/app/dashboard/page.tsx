'use client';
import dynamic from 'next/dynamic';
import PageLoader from '../components/PageLoader';

const DashboardContent = dynamic(
  () => import('../components/dashboard/DashboardContent'),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function DashboardPage() {
  return <DashboardContent />;
}
