'use client';

import React, { useState } from 'react';
import { Layout, Button, Avatar, Dropdown, Typography, Space } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Sidebar from '../sidebars/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';

const { Header, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // Mock user data for standalone dashboard
  const mockUser = user || {
    firstName: 'Demo',
    lastName: 'User',
    role: 'admin',
    email: 'demo@smallcircle.com',
    avatar: null
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        if (logout) {
          logout();
        } else {
          console.log('Logout clicked (standalone mode)');
        }
      },
    },
  ];

  return (
    <ProtectedRoute>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        
        <Layout style={{ 
          marginLeft: collapsed ? 80 : 200,
          transition: 'margin-left 0.2s'
        }}>
        {/* <Header 
          style={{ 
            padding: '0 24px', 
            background: '#fff', 
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <Space size="middle">
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ fontSize: '16px' }}
            />
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />}
                  src={'avatar' in mockUser ? mockUser.avatar : null}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text strong style={{ fontSize: '14px', lineHeight: 1 }}>
                    {mockUser.firstName} {mockUser.lastName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px', lineHeight: 1 }}>
                    {mockUser.role.toUpperCase()}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header> */}
        
          <Content
            style={{
              margin: 0,
              padding: 0,
              background: '#f8f9fa',
              minHeight: 'calc(100vh - 64px)',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ProtectedRoute>
  );
};

export default DashboardLayout;
