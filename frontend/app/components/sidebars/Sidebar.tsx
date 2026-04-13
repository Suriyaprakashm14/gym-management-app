'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Layout, Menu, Button, Typography, App, Modal, Form, Input, Space, Select } from 'antd';
import { usePathname } from 'next/navigation';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  BankOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useBranchContext } from '../../contexts/BranchContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchBranchesAsync, selectBranches, selectBranchesLoading } from '../../redux/branchesSlice';
import {
  logoutAsync,
  removeGymLogoAsync,
  selectGymLogoRemoving,
  selectGymSaving,
  updateGymAsync,
} from '../../redux/gymSlice';

const { Sider } = Layout;

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

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
  const pathname = usePathname();
  const { user, logout, updateUser } = useAuth();
  const [editGymModalVisible, setEditGymModalVisible] = useState(false);
  const [editGymLogoFile, setEditGymLogoFile] = useState<File | null>(null);
  const [editGymLogoPreview, setEditGymLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [editGymForm] = Form.useForm();
  const { selectedBranch, setSelectedBranch } = useBranchContext();
  const dispatch = useAppDispatch();
  const allBranches = useAppSelector(selectBranches);
  const branchesLoading = useAppSelector(selectBranchesLoading);
  const gymSaving = useAppSelector(selectGymSaving);
  const gymLogoRemoving = useAppSelector(selectGymLogoRemoving);
  
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

  // Owner-only: fetch branches for branch selector
  useEffect(() => {
    if (!isGymOwner || !currentUser.gymId) {
      return;
    }
    dispatch(fetchBranchesAsync(currentUser.gymId));
  }, [dispatch, isGymOwner, currentUser.gymId]);

  const branches = useMemo(() => {
    let mapped = Array.isArray(allBranches)
      ? allBranches.map((b) => ({
          _id: b._id,
          name: b.name ?? 'Branch',
        }))
      : [];

    const ownerBranches = (currentUser as any)?.branches as string[] | undefined;
    if (Array.isArray(ownerBranches) && ownerBranches.length > 0) {
      const allowedSet = new Set(ownerBranches.map((id) => id && id.toString()));
      mapped = mapped.filter((b) => allowedSet.has(b._id && b._id.toString()));
    }

    return mapped;
  }, [allBranches, currentUser]);

  useEffect(() => {
    if (!selectedBranch || !setSelectedBranch) return;
    if (!branches.some((b) => String(b._id) === String(selectedBranch))) {
      setSelectedBranch(null);
    }
  }, [branches, selectedBranch, setSelectedBranch]);

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
    icon: <CreditCardOutlined />,
    label: <Link href="/expenses" prefetch>Expenses</Link>,
  };

  const staffsMenuItem = {
    key: '/staffs',
    icon: <TeamOutlined />,
    label: <Link href="/staffs" prefetch>Staff/Manager</Link>,
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
    // Manager: Dashboard, Members, Revenue, Billing, Expenses, Staffs (staff in their branch only)
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
    try {
      await dispatch(logoutAsync()).unwrap();
      message.success('Logged out successfully');
    } catch {
      message.error('Logout failed, but clearing local session');
    }
    // Clear local auth state and redirect (logout() in AuthContext does router.replace('/login'))
    logout();
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
      if (file.size > MAX_LOGO_BYTES) {
        message.error('Logo is too large. Please upload an image under 500 KB.');
        e.target.value = '';
        return;
      }
      setEditGymLogoFile(file);
      const url = URL.createObjectURL(file);
      setEditGymLogoPreview(url);
    }
    e.target.value = '';
  };

  const handleRemoveGymLogo = async () => {
    if (!currentUser.gymId) return;
    try {
      await dispatch(removeGymLogoAsync()).unwrap();
      setEditGymLogoFile(null);
      setEditGymLogoPreview(null);
      updateUser({
        gymLogo: null,
      });
      message.success('Gym logo removed');
    } catch (err: any) {
      message.error(err?.message || 'Failed to remove gym logo');
    }
  };

  const handleEditGymSave = async () => {
    if (!currentUser.gymId) return;
    try {
      const values = await editGymForm.validateFields();
      let logoUrl: string | null = null;
      if (editGymLogoFile) {
        logoUrl = await fileToDataUrl(editGymLogoFile);
      }
      const payload: { name?: string; logoUrl?: string | null } = { name: values.gymName?.trim() || undefined };
      if (logoUrl !== null) payload.logoUrl = logoUrl;
      const res = await dispatch(updateGymAsync({ gymId: currentUser.gymId, data: payload })).unwrap();
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
      const rawMessage = String(err?.message || '').toLowerCase();
      if (rawMessage.includes('entity too large')) {
        message.error('Logo image is too large for the server. Please upload a smaller file (for example under 500 KB).');
      } else {
        message.error(err?.message || 'Failed to update gym');
      }
    }
  };

  return (
    <Sider
      width={200}
      collapsedWidth={80}
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
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        minWidth: collapsed ? 80 : 200,
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
        ) : null}
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
        confirmLoading={gymSaving}
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
            <Space align="start">
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
                  <span
                    style={{
                      color: '#999',
                      fontSize: 12,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    Click to upload
                  </span>
                )}
              </div>
              {(editGymLogoPreview || currentUser.gymLogo) && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleRemoveGymLogo}
                  loading={gymLogoRemoving}
                >
                  Remove logo
                </Button>
              )}
            </Space>
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
        flex: 1,
        overflowY: 'auto',
        padding: '0 8px'
      }}>
        {isGymOwner && (
          <div style={{ padding: collapsed ? '0 4px 12px' : '0 8px 12px' }}>
            <Select
              size="small"
              className="sidebar-branch-select"
              classNames={{ popup: { root: 'sidebar-branch-dropdown' } }}
              value={selectedBranch || 'overall'}
              onChange={(value) => {
                if (!setSelectedBranch) return;
                if (value === 'overall') {
                  setSelectedBranch(null);
                } else {
                  setSelectedBranch(String(value));
                }
              }}
              loading={branchesLoading}
              style={{ width: '100%' }}
              options={[
                { label: 'Overall', value: 'overall' },
                ...branches.map((b) => ({ label: b.name, value: b._id })),
              ]}
            />
          </div>
        )}
        <Menu
          className="app-sidebar-menu"
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          items={menuItems}
          selectedKeys={[pathname?.startsWith('/members') ? '/members' : (pathname && pathname !== '/') ? pathname : '/dashboard']}
          onClick={handleClick}
          style={{ border: 'none' }}
        />
      </div>
      
      {/* User info (owner/manager/staff) */}
      <div
        style={{
          padding: isGymOwner ? '12px 16px 20px' : '8px 16px 10px',
          borderTop: '1px solid #404040',
          background: '#001529',
        }}
      >
        {!collapsed && (
          <div style={{ color: 'white', lineHeight: 1.2 }}>
            <Typography.Text style={{ color: 'white', fontSize: 11, display: 'block' }}>
              {currentUser.firstName} {currentUser.lastName}
            </Typography.Text>
            <Typography.Text style={{ color: '#ccc', fontSize: 9, display: 'block', marginTop: 2 }}>
              {currentUser.role.toUpperCase().replace('_', ' ')}
            </Typography.Text>
          </div>
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;
