'use client';

import { Layout } from 'antd';
import Sidebar from '../sidebars/Sidebar';
import { useState } from 'react';
import ProtectedRoute from '../auth/ProtectedRoute';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout 
          style={{ 
            background: '#f0f2f5',
            marginLeft: collapsed ? 80 : 200, // Account for sidebar width
            transition: 'margin-left 0.2s'
          }}
        >
          <Content style={{ margin: 0, paddingBottom: 100 }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ProtectedRoute>
  );
}
