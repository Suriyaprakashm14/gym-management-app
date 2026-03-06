'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layout, Menu, Button, Typography, App } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  BankOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // Use actual user data or fallback to mock for demo
  const currentUser = user || {
    firstName: 'Demo',
    lastName: 'User',
    role: 'admin',
    gymId: 'demo-gym-id'
  };

  // Normalize role variants from different auth payloads.
  const normalizedRole = String(currentUser.role || '').toLowerCase().replace(/\s+/g, '_');
  const isGymOwner =
    normalizedRole === 'gym_owner' ||
    normalizedRole === 'owner' ||
    normalizedRole === 'admin';

  const baseMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard" prefetch>Dashboard</Link>,
    },
    {
      key: '/members',
      icon: <UserOutlined />,
      label: <Link href="/members" prefetch>Members</Link>,
    },
  ];

  const branchesMenuItem = {
    key: '/branches',
    icon: <BankOutlined />,
    label: <Link href="/branches" prefetch>Branches</Link>,
  };

  const billingMenuItem = {
    key: '/revenue',
    icon: <span style={{ fontWeight: 600, fontSize: '1em' }}>₹</span>,
    label: <Link href="/revenue" prefetch>Revenue</Link>,
  };

  const pendingBillingMenuItem = {
    key: '/billing',
    icon: <BankOutlined />,
    label: <Link href="/billing" prefetch>Billing</Link>,
  };

  const expensesMenuItem = {
    key: '/expenses',
    icon: <DollarOutlined />,
    label: <Link href="/expenses" prefetch>Expenses</Link>,
  };

  const logoutMenuItem = {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Logout',
  };

  const menuItems = [
    ...baseMenuItems,
    ...(isGymOwner ? [branchesMenuItem] : []),
    billingMenuItem,
    pendingBillingMenuItem,
    expensesMenuItem,
    logoutMenuItem,
  ];

  const handleClick = (e: { key: string }) => {
    if (e.key === 'logout') {
      handleLogout();
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await api.request('/auth/logout', { method: 'POST' });
      message.success('Logged out successfully');

      // Clear local auth state
      logout();
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Logout failed, but clearing local session');
      
      // Still clear local session and redirect even if API fails
      logout();
      router.push('/login');
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={onCollapse} 
      theme="dark"
      style={{ 
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000
      }}
    >
      <div style={{ 
        height: 50, 
        margin: 16, 
        color: 'white', 
        fontWeight: 'bold', 
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {!collapsed ? 'Small Circle' : 'SC'}
      </div>
      
      <div style={{ 
        height: 'calc(100vh - 150px)',
        overflowY: 'auto'
      }}>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          selectedKeys={[pathname?.startsWith('/members') ? '/members' : (pathname && pathname !== '/') ? pathname : '/dashboard']}
          onClick={handleClick}
          style={{ border: 'none' }}
        />
      </div>
      
      {/* User info and logout button */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '16px',
        borderTop: '1px solid #404040',
        background: '#001529'
      }}>
        {!collapsed && (
          <div style={{ marginBottom: '12px', color: 'white' }}>
            <Typography.Text style={{ color: 'white', fontSize: '12px' }}>
              {currentUser.firstName} {currentUser.lastName}
            </Typography.Text>
            <br />
            <Typography.Text style={{ color: '#ccc', fontSize: '10px' }}>
              {currentUser.role.toUpperCase()}
            </Typography.Text>
          </div>
        )}
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          loading={logoutLoading}
          style={{ 
            width: '100%', 
            color: 'white',
            border: 'none',
            background: 'transparent'
          }}
        >
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;
