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
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
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
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMembers, Member as StoreMember } from '../../redux/membersSlice';
import { fetchMembershipPrices } from '../../redux/membershipsSlice';
import { useMemberFilter } from '../../contexts/MemberFilterContext';
import { api } from '../../utils/api';
import EditMemberModal from './EditMemberModal';
import MemberDetailsModal from './MemberDetailsModal';

const { Text } = Typography;

const EMPTY = '—';

/** Convert stored image (base64 or data URL) to a src for Avatar/img */
function getAvatarSrc(image: string | undefined | null): string | undefined {
  if (!image || typeof image !== 'string') return undefined;
  if (image.startsWith('data:')) return image;
  return `data:image/jpeg;base64,${image}`;
}

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
  image?: string;
}

const PAGE_SIZE = 10;

const MemberTable: React.FC = () => {
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewMember, setRenewMember] = useState<Member | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [membershipTypes, setMembershipTypes] = useState<Array<{ id: string; type: string; price: number; duration: number }>>([]);
  const [renewForm] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dispatch = useAppDispatch();
  const { members, total, loading, error: membersError } = useAppSelector((s) => s.members);
  const reduxPlans = useAppSelector((s) => s.membershipPrices.items);
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

  // When Renew modal opens: show Redux plans immediately (prompt render), then refresh from API
  useEffect(() => {
    if (!renewModalVisible) return;
    const normalize = (list: any[]) =>
      list
        .filter((m: any) => m.isActive !== false)
        .map((m: any) => ({
          id: m.id ?? m._id,
          _id: m._id ?? m.id,
          type: typeof m.type === 'string' ? m.type.trim() : (m.name || String(m._id || m.id || '')),
          name: m.name ?? m.type,
          price: m.price,
          duration: m.duration,
        }));
    if (Array.isArray(reduxPlans) && reduxPlans.length > 0) {
      setMembershipTypes(normalize(reduxPlans));
    }
    const fetchPlans = async () => {
      try {
        const response = await api.membershipPrices.getAll();
        const listSource: any =
          Array.isArray(response)
            ? response
            : Array.isArray((response as any)?.data)
              ? (response as any).data
              : Array.isArray((response as any)?.items)
                ? (response as any).items
                : [];
        const list: any[] = Array.isArray(listSource) ? listSource : [];
        setMembershipTypes(normalize(list));
      } catch {
        message.error('Failed to load membership plans');
      }
    };
    fetchPlans();
  }, [renewModalVisible, message, reduxPlans]);

  const handleOpenRenew = (record: Member) => {
    setRenewMember(record);
    renewForm.setFieldsValue({ membership: undefined, planQuantity: 1, paidAmount: 0 });
    setRenewModalVisible(true);
  };

  const handleRenewModalClose = () => {
    setRenewModalVisible(false);
    setRenewMember(null);
    renewForm.resetFields();
  };

  const handleRenewSubmit = async () => {
    if (!renewMember) return;
    const values = await renewForm.validateFields().catch(() => null);
    if (!values) return;
    setRenewLoading(true);
    try {
      await api.members.renew(renewMember.key, {
        membership: values.membership,
        planQuantity: values.planQuantity ?? 1,
        paidAmount: values.paidAmount ?? 0,
      });
      message.success('Member renewed successfully');
      handleRenewModalClose();
      dispatch(fetchMembers({ page, limit: pageSize, status: filter }));
    } catch (err: any) {
      message.error(err?.message || 'Failed to renew member');
    } finally {
      setRenewLoading(false);
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
        image: (m as any).image,
      };
    });
  }, [members]);

  const columns: ColumnsType<Member> = [
    {
      title: 'Member',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string, record: Member) => {
        const avatarSrc = getAvatarSrc(record.image);
        return (
        <Space>
          <Avatar
            size={40}
            src={avatarSrc}
            style={{
              backgroundColor: avatarSrc ? 'transparent' : '#1890ff',
              verticalAlign: 'middle',
            }}
          >
            {!avatarSrc && (text && text !== EMPTY ? text.split(' ').map((n) => n[0]).join('') || '?' : '?')}
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
      );
      },
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
        if (record.billingStatus === 'overdue') {
          return (
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
              <Space direction="vertical" size={0}>
                <Text strong style={{ color: '#ff4d4f' }}>
                  {record.billingAmount && record.billingAmount !== EMPTY
                    ? record.billingAmount
                    : 'Overdue'}
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
        if (record.billingStatus === 'pending') {
          return (
            <Space>
              <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
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
          {record.status === 'inactive' && (
            <Tooltip title="Renew">
              <Button
                type="text"
                icon={<SyncOutlined style={{ color: '#52c41a' }} />}
                onClick={() => handleOpenRenew(record)}
              />
            </Tooltip>
          )}
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

      <Modal
        title="Renew membership"
        open={renewModalVisible}
        onCancel={handleRenewModalClose}
        onOk={handleRenewSubmit}
        confirmLoading={renewLoading}
        okText="Renew"
        destroyOnHidden

      >
        {renewMember && (
          <p style={{ marginBottom: 16 }}>
            Renew membership for <strong>{renewMember.name}</strong>.
          </p>
        )}
        <Form form={renewForm} layout="vertical" initialValues={{ planQuantity: 1, paidAmount: 0 }}>
          <Form.Item
            name="membership"
            label="Plan"
            rules={[{ required: true, message: 'Select a plan' }]}
          >
            <Select
              placeholder="Select plan"
              options={membershipTypes.map((p: any) => ({
                value: p.type,
                label: `${p.type || p.name}${p.price != null ? ` — ₹${p.price}` : ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="planQuantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="membershipStartDate" label="Start date" tooltip="Membership period starts from this date. Leave empty for today.">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paidAmount" label="Amount paid (₹)">
            <InputNumber min={0} step={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MemberTable;