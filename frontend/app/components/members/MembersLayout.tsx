'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MenuProps } from 'antd';
import { Layout, Menu, Button, Space, Typography, Badge, Select, ConfigProvider } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMembershipPrices } from '../../redux/membershipsSlice';
import { MemberFilterProvider, useMemberFilter, type MemberFilterValue } from '../../contexts/MemberFilterContext';
import AddMemberModal from './AddMemberModal';

const { Header, Content } = Layout;
const { Title } = Typography;

const theme = {
  token: {
    colorPrimary: '#08979c',
  },
};

interface MembersLayoutProps {
  children: React.ReactNode;
  organizationName?: string;
}

function MembersLayoutInner({
  children,
  organizationName = 'Small Circle Martial Arts',
}: MembersLayoutProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const memberCount = useAppSelector((state) => state.members.total);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { filter, setFilter } = useMemberFilter();

  // Prefetch membership plans so Add Member / Renew dropdowns render promptly
  useEffect(() => {
    dispatch(fetchMembershipPrices());
  }, [dispatch]);

  const getCurrentTab = () => {
    if (pathname === '/members') return 'members';
    if (pathname.includes('/check-in')) return 'check-in';
    if (pathname.includes('/memberships')) return 'memberships';
    return 'members';
  };

  const currentTab = getCurrentTab();

  const menuItems: MenuProps['items'] = [
    {
      key: 'members',
      icon: <UserOutlined />,
      label: (
        <Link href="/members" prefetch style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Space>
            Members
            <Badge count={memberCount} style={{ backgroundColor: '#08979c' }} />
          </Space>
        </Link>
      ),
    },
    {
      key: 'check-in',
      icon: <CheckCircleOutlined />,
      label: <Link href="/members/check-in" prefetch>Check-in</Link>,
    },
    {
      key: 'memberships',
      icon: <CreditCardOutlined />,
      label: <Link href="/members/memberships" prefetch>Memberships</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header
        style={{
          background: '#fff',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e8e8e8',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}
      >
        <Title level={4} style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>
          Members
        </Title>
      </Header>

      {/* Single sticky strip: tabs + action bar — flush under header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          position: 'sticky',
          top: 64,
          zIndex: 998,
        }}
      >
        <div style={{ padding: '0 24px' }}>
          <Menu
            mode="horizontal"
            selectedKeys={[currentTab]}
            items={menuItems}
            style={{ border: 'none', fontSize: 14 }}
          />
        </div>
        {currentTab === 'members' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
              minHeight: 56,
              padding: '12px 24px',
              borderTop: '1px solid #e8e8e8',
            }}
          >
            <Select
              value={filter}
              onChange={(value) => setFilter(value as MemberFilterValue)}
              options={[
                { label: 'All members', value: 'allMembers' },
                { label: 'Active', value: 'activeUsers' },
                { label: 'Inactive', value: 'inactiveUsers' },
                { label: 'Long time inactive', value: 'longTimeInactiveUsers' },
              ]}
              style={{ minWidth: 160 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
              style={{ flexShrink: 0, fontWeight: 600 }}
            >
              Add member
            </Button>
          </div>
        )}
      </div>

      <Content style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 64px)', padding: '24px 24px 32px' }}>
        {children}
      </Content>

      <AddMemberModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </Layout>
  );
}

const MembersLayout: React.FC<MembersLayoutProps> = (props) => {
  return (
    <ConfigProvider theme={theme}>
      <MemberFilterProvider>
        <MembersLayoutInner {...props} />
      </MemberFilterProvider>
    </ConfigProvider>
  );
};

export default MembersLayout;