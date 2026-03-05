'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  Table, 
  Tag, 
  Space, 
  Button, 
  Avatar, 
  Tooltip,
  Typography,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CreditCardOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMembers, Member as StoreMember } from '../../redux/membersSlice';
import EditMemberModal from './EditMemberModal';
import MemberDetailsModal from './MemberDetailsModal';

const { Text } = Typography;

interface Member {
  key: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  dob: string;
  discipline: string;
  membership: string;
  expiryInfo: string;
  image?: string;
  lastVisit: string;
  billingAmount: string;
  billingDate: string;
  billingStatus: 'paid' | 'overdue' | 'pending';
  hasPaymentCard: boolean;
  isFamilyAccount: boolean;
  status: 'active' | 'inactive';
}

const MemberTable: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const dispatch = useAppDispatch();
  const { members, loading } = useAppSelector((s) => s.members);

  useEffect(() => {
    // Always fetch members when component mounts
    dispatch(fetchMembers(undefined));
  }, [dispatch]);

  // Also fetch if members array becomes empty (e.g., after reload)
  useEffect(() => {
    if (members.length === 0 && !loading) {
      dispatch(fetchMembers(undefined));
    }
  }, [dispatch, members.length, loading]);

  const handleEdit = (record: Member) => {
    // Find the original member data from Redux state
    const originalMember = members.find((m: any) => m.id === record.key);
    if (originalMember) {
      setSelectedMember(originalMember);
      setEditModalVisible(true);
    }
  };

  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setSelectedMember(null);
  };

  const handleRowClick = (record: Member) => {
    setSelectedMemberId(record.key);
    setDetailsModalVisible(true);
  };

  const handleDetailsModalClose = () => {
    setDetailsModalVisible(false);
    setSelectedMemberId(null);
  };


  const dataSource: Member[] = useMemo(() => {
    const filtered = (members as StoreMember[]).filter((m) => {
      if (statusFilter === 'all') return true;
      const status = (m.status as string) || 'active';
      return statusFilter === 'active' ? status === 'active' : status === 'inactive';
    });

    return filtered.map((m) => ({
      key: m.id,
      name: m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unknown',
      email: m.email || '',
      phone: m.phone || '',
      age: (m.age as number) || 0,
      dob: m.dob || '',
      discipline: '',
      membership: m.membership || '',
      expiryInfo: m.expires || '',
      image: (m as any).image,
      lastVisit: m.lastVisit || '',
      billingAmount: m.billingAmount != null ? String(m.billingAmount) : '',
      billingDate: m.billingDate ? String(m.billingDate) : '',
      billingStatus: (m.billingStatus as any) || 'paid',
      hasPaymentCard: true,
      isFamilyAccount: false,
      status: (m.status as any) === 'inactive' ? 'inactive' : 'active',
    }));
  }, [members, statusFilter]);

  const columns: ColumnsType<Member> = [
    {
      title: 'Member',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string, record: Member) => (
        <Space>
          <Avatar 
            size={40} 
            style={{ 
              backgroundColor: '#1890ff',
              verticalAlign: 'middle'
            }}
            src={record.image ? `data:image/jpeg;base64,${record.image}` : undefined}
          >
            {!record.image && text.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <div>
            <div 
              style={{ 
                fontWeight: 500, 
                cursor: 'pointer',
                color: '#1890ff',
                textDecoration: 'underline'
              }}
              onClick={() => handleRowClick(record)}
            >
              {text}
            </div>
            <Tag color="success" style={{ marginTop: 4 }}>
              {record.status.toUpperCase()}
            </Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email: string) => (
        <Space size={4}>
          <MailOutlined style={{ color: '#8c8c8c' }} />
          <Text style={{ fontSize: 13 }}>{email}</Text>
        </Space>
      ),
    },
    {
      title: 'Mobile Number',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (phone: string) => (
        <Space size={4}>
          <PhoneOutlined style={{ color: '#8c8c8c' }} />
          <Text style={{ fontSize: 13 }}>{phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Age',
      key: 'age',
      width: 100,
      render: (_: unknown, record: Member) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.age}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.dob}</Text>
        </Space>
      ),
    },
    {
      title: 'Membership',
      key: 'membership',
      width: 220,
      render: (_: unknown, record: Member) => (
        <Space direction="vertical" size={4}>
          <Text>{record.membership}</Text>
          {record.expiryInfo && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.expiryInfo}</Text>
          )}
          {record.isFamilyAccount && (
            <Tag color="blue">FAMILY ACCOUNT</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Last Visit',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
      width: 120,
      render: (text: string) => (
        <Text type="secondary">
          {text ? new Date(text).toLocaleDateString() : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Billing Status',
      key: 'billing',
      width: 200,
      render: (_: unknown, record: Member) => {
        if (record.billingStatus === 'pending' && !record.hasPaymentCard) {
          return (
            <Space direction="vertical" size={4}>
              <Space size={4}>
                <CreditCardOutlined style={{ color: '#8c8c8c' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>No payment card</Text>
              </Space>
              <Button type="link" size="small" style={{ padding: 0, height: 'auto' }}>
                SEND REMINDER
              </Button>
            </Space>
          );
        }
        
        if (record.billingAmount) {
          return (
            <Space>
              {record.billingStatus === 'paid' ? (
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              ) : (
                <WarningOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
              )}
              <Space direction="vertical" size={0}>
                <Text 
                  strong 
                  style={{ 
                    color: record.billingStatus === 'paid' ? '#52c41a' : '#fa8c16' 
                  }}
                >
                  {record.billingAmount}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{record.billingDate}</Text>
              </Space>
            </Space>
          );
        }
        
        return null;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Member) => (
        <Space size={8}>
          <Tooltip title="View details">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleRowClick(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#13c2c2' }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => console.log('Delete', record.key)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space size={8}>
          <Text type="secondary">Status:</Text>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Space>
      </div>
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 1200 }}
        style={{ background: '#fff' }}
      />
      
      <EditMemberModal
        visible={editModalVisible}
        onClose={handleEditModalClose}
        member={selectedMember}
      />

      <MemberDetailsModal
        visible={detailsModalVisible}
        onClose={handleDetailsModalClose}
        memberId={selectedMemberId}
      />
    </>
  );
};

export default MemberTable;