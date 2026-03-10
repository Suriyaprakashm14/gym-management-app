'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Layout, Menu, Button, Typography, App, Modal, Form, Input } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  BankOutlined,
  TeamOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { Sider } = Layout;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, updateUser } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [editGymModalVisible, setEditGymModalVisible] = useState(false);
  const [editGymLoading, setEditGymLoading] = useState(false);
  const [editGymLogoFile, setEditGymLogoFile] = useState<File | null>(null);
  const [editGymLogoPreview, setEditGymLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [editGymForm] = Form.useForm();
  
  // Use actual user data or fallback to mock for demo
  const currentUser = user ?? {
    id: 'demo-user',
    firstName: 'Demo',
    lastName: 'User',
    role: 'gym_owner',
    branchId: 'demo-branch-id',
    gymId: 'demo-gym-id',
    gymName: 'GymPro',
    gymLogo: null,
  };

  // Normalize role variants from different auth payloads.
  const normalizedRole = String(currentUser.role || '').toLowerCase().replace(/\s+/g, '_');
  const isGymOwner = normalizedRole === 'gym_owner';
  const isManager = normalizedRole === 'manager';
  const isStaff = normalizedRole === 'staff';

  const baseDashboardItem = {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard" prefetch>Dashboard</Link>,
  };

  const baseMembersItem = {
    key: '/members',
    icon: <UserOutlined />,
    label: <Link href="/members" prefetch>Members</Link>,
  };

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
    icon: <span style={{ fontWeight: 600, fontSize: '1em' }}>₹</span>,
    label: <Link href="/expenses" prefetch>Expenses</Link>,
  };

  const staffsMenuItem = {
    key: '/staffs',
    icon: <TeamOutlined />,
    label: <Link href="/staffs" prefetch>Staffs</Link>,
  };

  const logoutMenuItem = {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Logout',
  };

  let menuItems;
  if (isGymOwner) {
    // Owner: Dashboard, Members, Branches, Revenue, Billing, Expenses, Staffs
    menuItems = [
      baseDashboardItem,
      baseMembersItem,
      branchesMenuItem,
      billingMenuItem,
      pendingBillingMenuItem,
      expensesMenuItem,
      staffsMenuItem,
      logoutMenuItem,
    ];
  } else if (isManager) {
    // Manager: Dashboard, Members, Revenue, Billing, Expenses, Staffs
    menuItems = [
      baseDashboardItem,
      baseMembersItem,
      billingMenuItem,
      pendingBillingMenuItem,
      expensesMenuItem,
      staffsMenuItem,
      logoutMenuItem,
    ];
  } else if (isStaff) {
    // Staff: Dashboard, Members, Billing
    menuItems = [
      baseDashboardItem,
      baseMembersItem,
      pendingBillingMenuItem,
      logoutMenuItem,
    ];
  } else {
    // Fallback for unexpected roles: basic navigation
    menuItems = [
      baseDashboardItem,
      baseMembersItem,
      logoutMenuItem,
    ];
  }

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

  const openEditGymModal = () => {
    if (!isGymOwner || !currentUser.gymId) return;
    editGymForm.setFieldsValue({ gymName: currentUser.gymName || '' });
    setEditGymLogoFile(null);
    setEditGymLogoPreview(null);
    setEditGymModalVisible(true);
  };

  const handleEditGymLogoClick = () => logoInputRef.current?.click();

  const handleEditGymLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setEditGymLogoFile(file);
      const url = URL.createObjectURL(file);
      setEditGymLogoPreview(url);
    }
    e.target.value = '';
  };

  const handleEditGymSave = async () => {
    if (!currentUser.gymId) return;
    try {
      const values = await editGymForm.validateFields();
      setEditGymLoading(true);
      let logoUrl: string | null = null;
      if (editGymLogoFile) {
        logoUrl = await fileToDataUrl(editGymLogoFile);
      }
      const payload: { name?: string; logoUrl?: string | null } = { name: values.gymName?.trim() || undefined };
      if (logoUrl !== null) payload.logoUrl = logoUrl;
      const res = await api.gyms.update(currentUser.gymId, payload);
      type GymUpdateResponse = { data?: { name?: string; logoUrl?: string | null } } | { name?: string; logoUrl?: string | null };
      const raw = res as GymUpdateResponse;
      const data = (raw && typeof raw === 'object' && 'data' in raw && raw.data != null) ? raw.data : (raw as { name?: string; logoUrl?: string | null });
      updateUser({
        gymName: data?.name ?? values.gymName?.trim(),
        gymLogo: data?.logoUrl !== undefined ? data.logoUrl : (logoUrl ?? currentUser.gymLogo),
      });
      message.success('Gym updated');
      setEditGymModalVisible(false);
    } catch (err: any) {
      message.error(err?.message || 'Failed to update gym');
    } finally {
      setEditGymLoading(false);
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
      <div
        role={isGymOwner ? 'button' : undefined}
        onClick={isGymOwner ? openEditGymModal : undefined}
        style={{
          minHeight: 50,
          margin: 16,
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          padding: collapsed ? 0 : '0 4px',
          cursor: isGymOwner ? 'pointer' : 'default',
          borderRadius: 8,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => isGymOwner && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        title={isGymOwner ? 'Click to edit gym name and logo' : undefined}
      >
        {currentUser.gymLogo ? (
          <img
            src={currentUser.gymLogo}
            alt=""
            style={{ width: collapsed ? 32 : 36, height: collapsed ? 32 : 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: collapsed ? 32 : 36, height: collapsed ? 32 : 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: collapsed ? 14 : 18 }}>
            {collapsed ? 'G' : 'Gym'}
          </div>
        )}
        {!collapsed && (
          <>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {currentUser.gymName || 'GymPro'}
            </span>
            {isGymOwner && <EditOutlined style={{ fontSize: 12, opacity: 0.7, flexShrink: 0 }} />}
          </>
        )}
      </div>

      <Modal
        title="Edit gym name and logo"
        open={editGymModalVisible}
        onCancel={() => setEditGymModalVisible(false)}
        onOk={handleEditGymSave}
        confirmLoading={editGymLoading}
        okText="Save"
        destroyOnHidden
      >
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleEditGymLogoChange}
          style={{ display: 'none' }}
          aria-hidden
        />
        <Form form={editGymForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Gym logo" help="Click the box to change logo">
            <div
              role="button"
              onClick={handleEditGymLogoClick}
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                border: '2px dashed #d9d9d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#fafafa',
              }}
            >
              {(editGymLogoPreview || currentUser.gymLogo) ? (
                <img
                  src={editGymLogoPreview || currentUser.gymLogo || ''}
                  alt="Gym logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#999', fontSize: 12 }}>Click to upload</span>
              )}
            </div>
          </Form.Item>
          <Form.Item
            name="gymName"
            label="Gym name"
            rules={[{ required: true, message: 'Enter gym name' }]}
          >
            <Input placeholder="Gym name" />
          </Form.Item>
        </Form>
      </Modal>
      
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
