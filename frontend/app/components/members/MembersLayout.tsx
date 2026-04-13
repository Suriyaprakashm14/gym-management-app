'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Tabs,
  Button,
  Space,
  Typography,
  Badge,
  Select,
  ConfigProvider,
  Row,
  Col,
  Flex,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMembershipPrices } from '../../redux/membershipsSlice';
import { fetchMembers } from '../../redux/membersSlice';
import { MemberFilterProvider, useMemberFilter, type MemberFilterValue } from '../../contexts/MemberFilterContext';
import { useAuth } from '../../contexts/AuthContext';
import AddMemberModal from './AddMemberModal';
import CreateMembershipModal from './CreateMembershipModal';

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

const TAB_TITLES: Record<MemberTabKey, string> = {
  members: 'Members',
  'check-in': 'Check-in',
  memberships: 'Memberships',
};

interface MembersLayoutProps {
  children: React.ReactNode;
  organizationName?: string;
}

function MembersLayoutInner({ children }: MembersLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const memberCount = useAppSelector((state) => state.members.total);
  const membersLoading = useAppSelector((state) => state.members.loading);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createMembershipOpen, setCreateMembershipOpen] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.role === 'gym_owner';
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
      {/* ── Sticky page header ─────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 998,
          padding: '16px 24px 0',
        }}
      >
        {/* Title row — mirrors gold-loan Row/Col/Flex pattern */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.2px' }}>
              {TAB_TITLES[activeKey]}
            </Title>
          </Col>

          {/* Right-side controls */}
          {activeKey === 'members' && (
            <Col>
              <Flex align="center" gap={8}>
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
                  icon={<ReloadOutlined />}
                  loading={membersLoading}
                  onClick={() => dispatch(fetchMembers(undefined))}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddModalOpen(true)}
                  style={{ fontWeight: 600 }}
                >
                  Add member
                </Button>
              </Flex>
            </Col>
          )}
          {activeKey === 'memberships' && isOwner && (
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateMembershipOpen(true)}
                style={{ fontWeight: 600 }}
              >
                Create Membership
              </Button>
            </Col>
          )}
        </Row>

        {/* Tabs */}
        <Tabs
          size="small"
          activeKey={activeKey}
          onChange={onTabChange}
          items={tabItems}
          tabBarStyle={{ marginBottom: 0 }}
          style={{ minHeight: 40 }}
        />
      </div>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <div style={{ padding: '24px', minHeight: 'calc(100vh - 120px)' }}>
        {children}
      </div>

      <AddMemberModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <CreateMembershipModal
        visible={createMembershipOpen}
        onClose={() => setCreateMembershipOpen(false)}
        onSuccess={() => { dispatch(fetchMembershipPrices()); setCreateMembershipOpen(false); }}
      />
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
