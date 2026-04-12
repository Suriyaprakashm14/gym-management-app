'use client';
import dynamic from 'next/dynamic';
import PageLoader from '../components/PageLoader';

const RevenueOverview = dynamic(
  () => import('../components/revenue/RevenueOverview'),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function RevenuePage() {
  return <RevenueOverview />;
}
