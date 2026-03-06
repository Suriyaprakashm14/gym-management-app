'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Avatar,
  Tooltip,
  Typography,
  Popconfirm,
  App,
  Empty,
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
import { useMemberFilter } from '../../contexts/MemberFilterContext';
import { api } from '../../utils/api';
import EditMemberModal from './EditMemberModal';
import MemberDetailsModal from './MemberDetailsModal';

const { Text } = Typography;

const EMPTY = '—';

function formatDateDDMMYY(value: string | undefined | null): string {
  if (value == null || value === '') return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function getEndTime(expiry: string | undefined | null): number | null {
  if (expiry == null || expiry === '') return null;
  const d = new Date(expiry);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

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
  lastVisit: string;
  billingAmount: string;
  billingDate: string;
  billingStatus: 'paid' | 'overdue' | 'pending';
  hasPaymentCard: boolean;
  isFamilyAccount: boolean;
  status: 'active' | 'inactive';
}

const PAGE_SIZE = 10;

const MemberTable: React.FC = () => {
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dispatch = useAppDispatch();
  const { members, total, loading, error: membersError } = useAppSelector((s) => s.members);
  const { filter } = useMemberFilter();

  const loadPage = useCallback(
    (p: number, size: number) => {
      dispatch(
        fetchMembers({
          page: p,
          limit: size,
          status: filter,
        })
      );
    },
    [dispatch, filter]
  );

  const prevFilterRef = useRef(filter);
  useEffect(() => {
    const pageToLoad = prevFilterRef.current !== filter ? 1 : page;
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;
      setPage(1);
    }
    loadPage(pageToLoad, pageSize);
  }, [filter, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps -- loadPage from filter/page/pageSize

  const handleEdit = (record: Member) => {
    const originalMember = members.find((m: any) => m.id === record.key);
    const memberToEdit = originalMember && originalMember.id ? { ...originalMember } : null;
    if (memberToEdit) {
      setSelectedMember(memberToEdit);
      setEditModalVisible(true);
    } else {
      message.warning('Member data not available. Please refresh and try again.');
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

  const handleDelete = async (record: Member) => {
    try {
      await api.members.delete(record.key);
      message.success('Member removed');
      loadPage(page, pageSize);
    } catch (err: any) {
      message.error(err?.message || 'Failed to remove member');
    }
  };

  const dataSource: Member[] = useMemo(() => {
    return (members as StoreMember[]).map((m) => {
      const name = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || EMPTY;
      const ageVal = m.age != null ? Number(m.age) : undefined;
      return {
        key: m.id,
        name,
        email: m.email ?? EMPTY,
        phone: m.phone ?? EMPTY,
        age: ageVal ?? 0,
        dob: m.dob ?? EMPTY,
        discipline: '',
        membership: m.membership ?? EMPTY,
        expiryInfo: m.expires ?? EMPTY,
        lastVisit: m.lastVisit ?? EMPTY,
        billingAmount: m.billingAmount ?? EMPTY,
        billingDate: m.billingDate ?? EMPTY,
        billingStatus: ((m.billingStatus as string) || 'pending') as 'paid' | 'overdue' | 'pending',
        hasPaymentCard: true,
        isFamilyAccount: false,
        status: (m.status as any) === 'inactive' ? 'inactive' : 'active',
      };
    });
  }, [members]);

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
              verticalAlign: 'middle',
            }}
          >
            {text && text !== EMPTY ? text.split(' ').map((n) => n[0]).join('') || '?' : '?'}
          </Avatar>
          <div>
            <div
              style={{
                fontWeight: 500,
                color: '#1f1f1f',
              }}
            >
              {text}
            </div>
            <Tag
              color={record.status === 'inactive' ? 'default' : 'success'}
              style={{
                marginTop: 4,
                ...(record.status === 'inactive' ? { color: '#8c8c8c', borderColor: '#d9d9d9' } : {}),
              }}
            >
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
          <Text style={{ fontSize: 13 }}>{email === EMPTY ? EMPTY : email}</Text>
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
          <Text style={{ fontSize: 13 }}>{phone === EMPTY ? EMPTY : phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Age',
      key: 'age',
      width: 100,
      render: (_: unknown, record: Member) => (
        <Text strong>{record.age || EMPTY}</Text>
      ),
    },
    {
      title: 'Membership',
      key: 'membership',
      width: 220,
      render: (_: unknown, record: Member) => (
        <Space direction="vertical" size={4}>
          <Text>{record.membership === EMPTY ? EMPTY : record.membership}</Text>
          {record.expiryInfo && record.expiryInfo !== EMPTY && (
            <Text type="secondary" style={{ fontSize: 12 }}>{formatDateDDMMYY(record.expiryInfo)}</Text>
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
        <Text type="secondary">{text === EMPTY ? EMPTY : formatDateDDMMYY(text)}</Text>
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
        if (record.billingStatus === 'paid' && record.billingAmount) {
          return (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              <Space direction="vertical" size={0}>
                <Text strong style={{ color: '#52c41a' }}>{record.billingAmount}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.billingDate === EMPTY ? EMPTY : formatDateDDMMYY(record.billingDate)}
                </Text>
              </Space>
            </Space>
          );
        }
        if (record.billingStatus === 'overdue' || record.billingStatus === 'pending') {
          return (
            <Space>
              <WarningOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
              <Space direction="vertical" size={0}>
                <Text strong style={{ color: '#fa8c16' }}>
                  {record.billingAmount && record.billingAmount !== EMPTY
                    ? record.billingAmount
                    : 'Pending'}
                </Text>
                {record.billingDate && record.billingDate !== EMPTY && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDateDDMMYY(record.billingDate)}
                  </Text>
                )}
              </Space>
            </Space>
          );
        }
        return (
          <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_: unknown, record: Member) => (
        <Space size={8}>
          <Tooltip title="View Details">
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
          <Popconfirm
            title="Remove this member?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
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
      {membersError && members.length === 0 && !loading && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">{membersError}</Text>
        </div>
      )}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey="key"
        pagination={{
          current: page,
          pageSize,
          total,
          pageSizeOptions: ['10', '20', '50'],
          showSizeChanger: true,
          showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} members`,
          onChange: (p, size) => {
            setPage(p);
            if (size !== pageSize) setPageSize(size);
          },
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: '#666' }}>No Data Found</span>}
            />
          ),
        }}
        sticky
        scroll={{ x: 1200, y: 500 }}
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