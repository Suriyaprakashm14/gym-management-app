import React from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import BillingOverview from './RevenueOverview';
import ProtectedRoute from '../auth/ProtectedRoute';

const BillingPage = () => {
  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'admin']}>
      <DashboardLayout>
        <BillingOverview/>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default BillingPage;
