'use client';

import { Layout } from 'antd';
import { useState } from 'react';
import Sidebar from '../components/sidebars/Sidebar';

const { Content } = Layout;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }} hasSider>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout
        style={{
          background: '#f0f2f5',
          marginLeft: collapsed ? 80 : 200,
          transition: 'margin-left 0.2s',
          minWidth: 0,
          flex: 1,
        }}
      >
        <Content style={{ margin: 0, paddingBottom: 100, minWidth: 0 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
