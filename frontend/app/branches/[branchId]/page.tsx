'use client';

import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Space, Spin, App } from 'antd';
import { HomeOutlined, TeamOutlined, PhoneOutlined, EnvironmentOutlined, DashboardOutlined, UserAddOutlined, EditOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { useBranchContext } from '../../contexts/BranchContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';

const { Title, Text } = Typography;

interface BranchDetail {
  _id: string;
  name: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
  contactInfo?: { phone?: string };
  branchManagers?: Array<{ _id: string; name?: string; email?: string }>;
  memberCount?: number;
  isActive?: boolean;
}

export default function BranchViewPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const branchId = params?.branchId as string | undefined;
  const { setSelectedBranch } = useBranchContext();
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.branches
      .getById(branchId)
      .then((res: any) => {
        if (cancelled) return;
        if (res && (res.error || res.status === 404)) {
          setBranch(null);
          return;
        }
        const data = res?.data ?? res;
        if (!data || !data._id) {
          setBranch(null);
          return;
        }
        setBranch({
          _id: data._id ?? branchId,
          name: data.name ?? 'Branch',
          address: data.address,
          contactInfo: data.contactInfo,
          branchManagers: data.branchManagers ?? (data.branchManager ? [data.branchManager] : []),
          memberCount: data.memberCount,
          isActive: data.isActive !== false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          message.error('Failed to load branch');
          setBranch(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [branchId, message]);

  const handleViewBranchDashboard = () => {
    if (!branchId) return;
    setSelectedBranch(branchId);
    router.push('/dashboard');
  };

  const handleNavigateTo = (path: string) => {
    if (!branchId) return;
    setSelectedBranch(branchId);
    router.push(path);
  };

  if (!branchId) {
    return (
      <ProtectedRoute allowedRoles={['gym_owner']}>
        <div style={{ padding: 24 }}>
          <Text type="secondary">Branch ID is missing.</Text>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['gym_owner']}>
      <div style={{ padding: 24 }}>
        <Title level={2} style={{ marginBottom: 24 }}>Branch view</Title>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : !branch ? (
          <Card>
            <Text type="secondary">Branch not found.</Text>
          </Card>
        ) : (
          <>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <Space direction="vertical" size={8}>
                  <Space align="center">
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <HomeOutlined style={{ fontSize: 24 }} />
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>{branch.name}</Title>
                      <Text type="secondary">{branch.isActive !== false ? 'Active' : 'Inactive'}</Text>
                    </div>
                  </Space>
                  {branch.address && (
                    <Space size={4}>
                      <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
                      <Text>
                        {[branch.address.street, branch.address.city, branch.address.state, branch.address.zipCode, branch.address.country].filter(Boolean).join(', ') || 'No address'}
                      </Text>
                    </Space>
                  )}
                  {branch.contactInfo?.phone && (
                    <Space size={4}>
                      <PhoneOutlined style={{ color: '#8c8c8c' }} />
                      <Text>{branch.contactInfo.phone}</Text>
                    </Space>
                  )}
                  {branch.branchManagers && branch.branchManagers.length > 0 && (
                    <Space size={4}>
                      <TeamOutlined style={{ color: '#8c8c8c' }} />
                      <Text>Managers: {branch.branchManagers.map((m: any) => m.name ?? m.email ?? '—').join(', ')}</Text>
                    </Space>
                  )}
                  {typeof branch.memberCount === 'number' && (
                    <Text strong>{branch.memberCount} members</Text>
                  )}
                </Space>
                <Space>
                  <Button type="primary" icon={<DashboardOutlined />} onClick={handleViewBranchDashboard}>
                    View branch dashboard
                  </Button>
                  <Link href="/branches">
                    <Button icon={<EditOutlined />}>Edit branch</Button>
                  </Link>
                </Space>
              </div>
            </Card>
            <Card title="Quick links" style={{ marginBottom: 16 }}>
              <Space wrap>
                <Button onClick={() => handleNavigateTo('/members')}>Members</Button>
                <Button onClick={() => handleNavigateTo('/revenue')}>Revenue</Button>
                <Button onClick={() => handleNavigateTo('/staffs')}>Staff</Button>
                <Button onClick={() => handleNavigateTo('/expenses')}>Expenses</Button>
                <Button onClick={() => handleNavigateTo('/billing')}>Billing</Button>
              </Space>
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">These links switch the app to this branch so you see branch-scoped data with owner authority.</Text>
              </div>
            </Card>
            <div>
              <Link href="/branches">Back to all branches</Link>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
