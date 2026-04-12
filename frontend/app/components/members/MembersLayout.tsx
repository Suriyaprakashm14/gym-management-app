'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, Button, Space, Typography, Badge, Select, ConfigProvider } from 'antd';
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

const { Title } = Typography;

const theme = {
  token: {
    colorPrimary: '#08979c',
  },
};

const MEMBER_ROUTES = {
  members: '/members',
  'check-in': '/members/check-in',
  memberships: '/members/memberships',
} as const;

type MemberTabKey = keyof typeof MEMBER_ROUTES;

function tabKeyFromPathname(pathname: string): MemberTabKey {
  if (pathname.startsWith('/members/check-in')) return 'check-in';
  if (pathname.startsWith('/members/memberships')) return 'memberships';
  return 'members';
}

interface MembersLayoutProps {
  children: React.ReactNode;
  organizationName?: string;
}

function MembersLayoutInner({ children }: MembersLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const memberCount = useAppSelector((state) => state.members.total);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { filter, setFilter } = useMemberFilter();

  useEffect(() => {
    dispatch(fetchMembershipPrices());
  }, [dispatch]);

  useEffect(() => {
    (Object.values(MEMBER_ROUTES) as string[]).forEach((href) => {
      router.prefetch(href);
    });
  }, [router]);

  const activeKey = tabKeyFromPathname(pathname);

  const onTabChange = (key: string) => {
    const href = MEMBER_ROUTES[key as MemberTabKey];
    if (href) router.push(href);
  };

  const tabItems = [
    {
      key: 'members',
      label: (
        <Space size={6}>
          <UserOutlined />
          Members
          <Badge count={memberCount} size="small" style={{ backgroundColor: '#08979c' }} />
        </Space>
      ),
    },
    {
      key: 'check-in',
      label: (
        <Space size={6}>
          <CheckCircleOutlined />
          Check-in
        </Space>
      ),
    },
    {
      key: 'memberships',
      label: (
        <Space size={6}>
          <CreditCardOutlined />
          Memberships
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 998,
        }}
      >
        <div style={{ padding: '12px 24px 0' }}>
          <Title level={4} style={{ margin: 0, fontSize: 20, lineHeight: 1.2, marginBottom: 4 }}>
            Members
          </Title>
          <Tabs
            size="small"
            activeKey={activeKey}
            onChange={onTabChange}
            items={tabItems}
            tabBarStyle={{ marginBottom: 0 }}
            style={{ minHeight: 40 }}
          />
        </div>
        {activeKey === 'members' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
              minHeight: 52,
              padding: '10px 24px 12px',
              borderTop: '1px solid #f0f0f0',
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

      <div style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 120px)', padding: '24px 24px 32px' }}>
        {children}
      </div>

      <AddMemberModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
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
