"use client";

import { Table, Typography, Tag, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMembershipPrices } from '../../redux/membershipsSlice';
import { useAuth } from '../../contexts/AuthContext';
import CreateMembershipModal from '../../components/members/CreateMembershipModal';
import EditMembershipModal from '../../components/members/EditMembershipModal';

const { Title, Text } = Typography;

export default function MembershipsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.membershipPrices);
  const router = useRouter();
  const { user } = useAuth();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchMembershipPrices());
  }, [dispatch]);

  const formatINR = (value?: number) => {
    if (typeof value !== 'number') return '';
    return value.toLocaleString('en-IN');
  };

  type Row = {
    key: string;
    name: string;
    duration: string;
    priceInr: string;
    isActive: boolean;
    description?: string;
    type?: string;
  };

  const columns: ColumnsType<Row> = [
    {
      title: 'Plan',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (_: string, record: Row) => (
        <a
          onClick={() => {
            if (isGymOwner) {
              // If gym owner, allow editing
              handleEditMembership(record);
            } else {
              // If not gym owner, navigate to filtered view
              const type = (record.type || record.duration || record.name || '').toLowerCase();
              router.push(`/members/memberships?type=${encodeURIComponent(type)}`);
            }
          }}
          style={{ 
            color: isGymOwner ? '#1890ff' : '#1890ff',
            cursor: 'pointer'
          }}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 140,
    },
    {
      title: 'Price (₹)',
      dataIndex: 'priceInr',
      key: 'priceInr',
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'red'}>{val ? 'ACTIVE' : 'INACTIVE'}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const data: Row[] = items.map((p) => ({
    key: p.id,
    name: (p.type || p.name || '').toString(),
    duration: (p.duration || '').toString(),
    priceInr: formatINR(p.price),
    isActive: Boolean(p.isActive ?? true),
    description: p.description,
    type: p.type,
  }));

  const handleCreateMembership = () => {
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = () => {
    dispatch(fetchMembershipPrices()); // Refresh the list
  };

  const handleEditMembership = (membership: any) => {
    // Find the original membership data from the items array
    const originalMembership = items.find((item: any) => item.id === membership.key);
    setSelectedMembership({
      ...membership,
      id: membership.key,
      originalData: originalMembership
    });
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    dispatch(fetchMembershipPrices()); // Refresh the list
  };

  const isGymOwner = user?.role === 'gym_owner';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Membership Prices</Title>
        {isGymOwner && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateMembership}
          >
            Create Membership
          </Button>
        )}
      </div>
      {error && (
        <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>{error}</Text>
      )}
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        style={{ background: '#fff' }}
      />
      
      <CreateMembershipModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
      
      <EditMembershipModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
        membership={selectedMembership}
      />
    </div>
  );
}