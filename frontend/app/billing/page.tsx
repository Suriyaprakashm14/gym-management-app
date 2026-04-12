'use client';
import dynamic from 'next/dynamic';
import PageLoader from '../components/PageLoader';

const BillingContent = dynamic(
  () => import('../components/billing/BillingContent'),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function BillingPage() {
  return <BillingContent />;
}
