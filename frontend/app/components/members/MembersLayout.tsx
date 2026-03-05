'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MenuProps } from 'antd';
import { Layout, Menu, Button, Space, Avatar, Typography, Dropdown, Badge, Radio, ConfigProvider } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  FullscreenOutlined,
  TranslationOutlined,
  DownOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../redux/hooks';
import { MemberFilterProvider, useMemberFilter, type MemberFilterValue } from '../../contexts/MemberFilterContext';
import AddMemberModal from './AddMemberModal';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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
  const memberCount = useAppSelector((state) => state.members.total);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { filter, setFilter } = useMemberFilter();

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

  const organizationMenuItems: MenuProps['items'] = [
    { key: '1', label: organizationName },
    { type: 'divider' },
    { key: '2', label: 'Switch Organization' },
    { key: '3', label: 'Organization Settings' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header
        style={{
          background: '#fff',
          padding: '16px 24px 0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e8e8e8',
          height: 80,
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}
      >
        <Space size={16} align="center">
          <Avatar
            size={40}
            style={{ backgroundColor: '#52c41a' }}
            icon={<UserOutlined />}
          />
          <div>
            <Title level={4} style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>
              Members
            </Title>
            <Dropdown menu={{ items: organizationMenuItems }} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }} size={4}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {organizationName}
                </Text>
                <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
              </Space>
            </Dropdown>
          </div>
        </Space>
        <Space size={12}>
          <Button icon={<FullscreenOutlined />} type="text" size="large" />
          <Button icon={<TranslationOutlined />} type="text" size="large" />
        </Space>
      </Header>

      {/* Single sticky strip: tabs + action bar */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          position: 'sticky',
          top: 80,
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
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 56,
              padding: '12px 24px',
              borderTop: '1px solid #e8e8e8',
            }}
          >
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={filter}
                onChange={(e) => setFilter(e.target.value as MemberFilterValue)}
                options={[
                  { label: 'Active Users', value: 'activeUsers' },
                  { label: 'Recently Expired', value: 'recentlyExpired' },
                  { label: 'Archived Users', value: 'archivedUsers' },
                ]}
              />
            </div>
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

      <Content style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 80px)', padding: '24px 24px 32px' }}>
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