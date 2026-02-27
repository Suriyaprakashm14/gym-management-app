'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '../sidebars/Sidebar';
import type { MenuProps } from 'antd';
import {
  Layout,
  Menu,
  Button,
  Space,
  Avatar,
  Typography,
  Dropdown,
  Badge,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  UserAddOutlined,
  StopOutlined,
  FullscreenOutlined,
  TranslationOutlined,
  DownOutlined,
  PlusOutlined,
  PrinterOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import ProtectedRoute from '../auth/ProtectedRoute';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface MembersLayoutProps {
  children: React.ReactNode;
  organizationName?: string;
}

const MembersLayout: React.FC<MembersLayoutProps> = ({
  children,
  organizationName = 'Small Circle Martial Arts',
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const getCurrentTab = () => {
    if (pathname === '/members') return 'members';
    if (pathname.includes('/check-in')) return 'check-in';
    if (pathname.includes('/memberships')) return 'memberships';
    if (pathname.includes('/add-members')) return 'add-members';
    if (pathname.includes('/freeze')) return 'freeze';
    return 'members';
  };

  const currentTab = getCurrentTab();

  const menuItems: MenuProps['items'] = [
    {
      key: 'members',
      icon: <UserOutlined />,
      label: (
        <Space>
          Members
          <Badge count={33} style={{ backgroundColor: '#1890ff' }} />
        </Space>
      ),
    },
    { key: 'check-in', icon: <CheckCircleOutlined />, label: 'Check-in' },
    { key: 'memberships', icon: <CreditCardOutlined />, label: 'Memberships' },
    { key: 'add-members', icon: <UserAddOutlined />, label: 'Add Members' },
    { key: 'freeze', icon: <StopOutlined />, label: 'Freeze' },
  ];

  const organizationMenuItems: MenuProps['items'] = [
    { key: '1', label: organizationName },
    { type: 'divider' },
    { key: '2', label: 'Switch Organization' },
    { key: '3', label: 'Organization Settings' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    const routes: Record<string, string> = {
      members: '/members',
      'check-in': '/members/check-in',
      memberships: '/members/memberships',
      'add-members': '/members/add-members',
      freeze: '/members/freeze',
    };
    if (routes[key]) router.push(routes[key]);
  };

  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager']}>
      <Layout style={{ minHeight: '100vh' }}>
        {/* Sidebar */}
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />

      {/* Main Content Area */}
      <Layout style={{ 
        background: '#f0f2f5',
        marginLeft: collapsed ? 80 : 200,
        transition: 'margin-left 0.2s'
      }}>
        {/* Header */}
        <Header
          style={{
            background: '#fff',
            padding: '16px 24px 0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
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
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontSize: 20,
                  lineHeight: 1.2,
                }}
              >
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

        {/* Navigation Tabs */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
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
              onClick={handleMenuClick}
              style={{
                border: 'none',
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* Action Bar */}
        {currentTab === 'members' && (
          <div
            style={{
              background: '#fff',
              padding: '16px 24px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 144,
              zIndex: 997,
            }}
          >
            <Space size={12}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{
                  backgroundColor: '#13c2c2',
                  borderColor: '#13c2c2',
                }}
              >
                ADD MEMBER
              </Button>

              <Button
                icon={<UserAddOutlined />}
                style={{
                  backgroundColor: '#595959',
                  borderColor: '#595959',
                  color: '#fff',
                }}
              >
                INVITE
              </Button>
            </Space>

            <Space size={12}>
              <Button icon={<PrinterOutlined />}>PRINT</Button>
              <Button icon={<ExportOutlined />}>EXPORT</Button>
            </Space>
          </div>
        )}

        {/* Main Page Content */}
        <Content
          style={{
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 80px)',
          }}
        >
          {children}
        </Content>
      </Layout>
      </Layout>
    </ProtectedRoute>
  );
};

export default MembersLayout;