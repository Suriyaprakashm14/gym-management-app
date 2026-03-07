'use client';

import { Table, Typography, Tag, Button, Space, Tooltip, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMembershipPrices } from '../../redux/membershipsSlice';
import { useAuth } from '../../contexts/AuthContext';
import CreateMembershipModal from '../../components/members/CreateMembershipModal';
import EditMembershipModal from '../../components/members/EditMembershipModal';
import { api } from '../../utils/api';

const { Title, Text } = Typography;

const CANNOT_DELETE_MESSAGE = 'Cannot delete this membership plan because active users are currently assigned.';
const CANNOT_DELETE_ACTIVE_MESSAGE = 'Cannot delete an active plan. Make it inactive first.';
const CANNOT_DELETE_INACTIVE_USERS_MESSAGE = 'Cannot delete until all users on this plan have expired.';

type Row = { key: string; name: string; duration: string; priceInr: string; isActive: boolean; activeCount: number; description?: string; type?: string };

export default function MembershipsPage() {
  const { message } = App.useApp();
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

  const formatINR = (value?: number) => (typeof value !== 'number' ? '' : value.toLocaleString('en-IN'));

  const isGymOwner = user?.role === 'gym_owner';

  const handleEditMembership = (record: Row) => {
    const originalMembership = items.find((item: any) => item.id === record.key);
    setSelectedMembership({ ...record, id: record.key, originalData: originalMembership });
    setEditModalVisible(true);
  };

  const handleDeleteMembership = (record: Row) => {
    if (record.isActive) {
      message.error(CANNOT_DELETE_ACTIVE_MESSAGE);
      return;
    }
    if (record.activeCount > 0) {
      message.error(CANNOT_DELETE_INACTIVE_USERS_MESSAGE);
      return;
    }
    const run = async () => {
      try {
        await api.membershipPrices.delete(record.key);
        message.success('Membership plan deleted');
        dispatch(fetchMembershipPrices());
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('active users') || msg.includes('currently assigned')) {
          message.error(CANNOT_DELETE_MESSAGE);
        } else if (msg.includes('inactive first')) {
          message.error(CANNOT_DELETE_ACTIVE_MESSAGE);
        } else {
          message.error(msg || 'Failed to delete membership plan');
        }
      }
    };
    run().catch(() => {
      message.error('Something went wrong. Please try again.');
    });
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
            if (isGymOwner) handleEditMembership(record);
            else router.push(`/members/memberships?type=${encodeURIComponent((record.type || record.name || '').toLowerCase())}`);
          }}
          style={{ color: '#1890ff', cursor: 'pointer' }}
        >
          {record.name}
        </a>
      ),
    },
    { title: 'Duration', dataIndex: 'duration', key: 'duration', width: 140 },
    { title: 'Price (₹)', dataIndex: 'priceInr', key: 'priceInr', width: 140 },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (val: boolean) => <Tag color={val ? 'green' : 'red'}>{val ? 'ACTIVE' : 'INACTIVE'}</Tag>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    ...(isGymOwner
      ? [
          {
            title: 'Actions',
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_: unknown, record: Row) => {
              const canDelete = !record.isActive && record.activeCount === 0;
              const deleteDisabled = !record.isActive && record.activeCount > 0;
              return (
                <Space size={8}>
                  <Tooltip title={record.isActive ? 'Make inactive' : 'Edit status'}>
                    <Button
                      type="text"
                      icon={<EditOutlined style={{ color: '#13c2c2' }} />}
                      onClick={() => handleEditMembership(record)}
                    />
                  </Tooltip>
                  {deleteDisabled ? (
                    <Tooltip title={CANNOT_DELETE_INACTIVE_USERS_MESSAGE}>
                      <span>
                        <Button type="text" danger icon={<DeleteOutlined />} disabled />
                      </span>
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title="Delete this membership plan?"
                      description={
                        record.isActive
                          ? 'Make the plan inactive first, then delete when no users are on it.'
                          : 'This can only be done when no active users are assigned to this plan.'
                      }
                      onConfirm={() => handleDeleteMembership(record)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Tooltip title={canDelete ? 'Delete' : CANNOT_DELETE_ACTIVE_MESSAGE}>
                        <span>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={!canDelete}
                          />
                        </span>
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          } as const,
        ]
      : []),
  ];

  const data: Row[] = items.map((p) => ({
    key: p.id || (p as any)._id,
    name: (p.type || p.name || '').toString(),
    duration: (p.duration || '').toString(),
    priceInr: formatINR(p.price),
    isActive: Boolean(p.isActive ?? true),
    activeCount: Number(p.activeCount ?? 0),
    description: p.description,
    type: p.type,
  }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Membership Prices
        </Title>
        {isGymOwner && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            Create Membership
          </Button>
        )}
      </div>
      {error && items.length === 0 && (
        <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>{error}</Text>
      )}
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        sticky
        scroll={{ x: 800, y: 500 }}
      />
      <CreateMembershipModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onSuccess={() => dispatch(fetchMembershipPrices())} />
      <EditMembershipModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} onSuccess={() => dispatch(fetchMembershipPrices())} membership={selectedMembership} />
    </div>
  );
}
