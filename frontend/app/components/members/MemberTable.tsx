'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Tooltip,
  Typography,
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
import {
  deleteMemberAsync,
  fetchMembers,
  Member as StoreMember,
  renewMemberAsync,
  selectRenewMemberLoading,
} from '../../redux/membersSlice';
import { fetchMembershipPrices } from '../../redux/membershipsSlice';
import { useMemberFilter } from '../../contexts/MemberFilterContext';
import { useBranchContext } from '../../contexts/BranchContext';
import { useAuth } from '../../contexts/AuthContext';
import EditMemberModal from './EditMemberModal';
import MemberDetailsModal from './MemberDetailsModal';
import PageLoader from '../PageLoader';

const { Text } = Typography;

const EMPTY = '—';

/** Convert stored image (base64 or data URL) to a src for Avatar/img */
function getAvatarSrc(image: string | undefined | null): string | undefined {
  if (!image || typeof image !== 'string') return undefined;
  if (image.startsWith('data:')) return image;
  return `data:image/jpeg;base64,${image}`;
}

function formatDateDDMMYYYY(value: string | undefined | null): string {
  if (value == null || value === '') return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
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
  image?: string;
  lastVisit: string;
  billingAmount: string;
  billingDate: string;
  billingStatus: 'paid' | 'overdue' | 'pending';
  hasPaymentCard: boolean;
  isFamilyAccount: boolean;
  status: 'active' | 'inactive' | 'long term inactive' | 'upcoming';
}

const PAGE_SIZE = 10;

/** Ant Design CSS-in-JS registers cleanup after unmount in Table cells (known issue with React 18/Next.js). Suppress the harmless warning in dev. */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const firstArg = args[0];
    const msg =
      typeof firstArg === 'string'
        ? firstArg
        : firstArg instanceof Error && typeof firstArg.message === 'string'
          ? firstArg.message
          : '';
    if (msg.includes('registering a cleanup function after unmount') && msg.includes('Ant Design CSS-in-JS')) return;
    originalError.apply(console, args);
  };
}

const MemberTable: React.FC = () => {
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewMember, setRenewMember] = useState<Member | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<Array<{ id: string; type: string; price: number; duration: number }>>([]);
  const [renewForm] = Form.useForm();
  const renewPlanType = Form.useWatch('membership', renewForm);
  const renewMaxAmount =
    renewPlanType && membershipTypes.length > 0
      ? (() => {
          const plan = membershipTypes.find((p: any) => p.type === renewPlanType);
          return plan && typeof plan.price === 'number' ? plan.price : null;
        })()
      : null;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dispatch = useAppDispatch();
  const { members, total, loading, error: membersError } = useAppSelector((s) => s.members);
  const reduxPlans = useAppSelector((s) => s.membershipPrices.items);
  const renewLoading = useAppSelector(selectRenewMemberLoading);
  const { filter } = useMemberFilter();
  const { selectedBranch } = useBranchContext();
  const { user } = useAuth();

  const isOwner = user?.role === 'gym_owner';

  const buildMemberFetchParams = useCallback(
    (p: number, size: number): Record<string, string | number> => {
      const params: Record<string, string | number> = {
        page: p,
        limit: size,
        status: filter,
      };
      if (user?.gymId) {
        params.gymId = user.gymId;
      }
      if (isOwner && selectedBranch) {
        params.branchId = selectedBranch;
      }
      if ((user?.role === 'manager' || user?.role === 'staff') && user?.branchId) {
        params.branchId = user.branchId;
      }
      return params;
    },
    [filter, isOwner, selectedBranch, user?.gymId, user?.branchId, user?.role]
  );

  const loadPage = useCallback(
    (p: number, size: number) => {
      dispatch(fetchMembers(buildMemberFetchParams(p, size)));
    },
    [dispatch, buildMemberFetchParams]
  );

  const prevFilterRef = useRef(filter);
  useEffect(() => {
    const pageToLoad = prevFilterRef.current !== filter ? 1 : page;
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;
      setPage(1);
    }
    loadPage(pageToLoad, pageSize);
  }, [filter, page, pageSize, selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps -- loadPage from filter/page/pageSize/selectedBranch

  const membersRef = useRef(members);
  membersRef.current = members;

  const handleEdit = useCallback(
    (record: Member) => {
      const originalMember = membersRef.current.find((m: any) => m.id === record.key);
      const memberToEdit = originalMember && originalMember.id ? { ...originalMember } : null;
      if (memberToEdit) {
        setSelectedMember(memberToEdit);
        setEditModalVisible(true);
      } else {
        message.warning('Member data not available. Please refresh and try again.');
      }
    },
    [message]
  );

  const normalizeMembershipPlans = useCallback(
    (list: any[]) =>
      list
        .filter((m: any) => m.isActive !== false)
        .map((m: any) => ({
          id: m.id ?? m._id,
          _id: m._id ?? m.id,
          type: typeof m.type === 'string' ? m.type.trim() : (m.name || String(m._id || m.id || '')),
          name: m.name ?? m.type,
          price: m.price,
          duration: m.duration,
        })),
    []
  );

  useEffect(() => {
    if (!renewModalVisible) return;
    if (Array.isArray(reduxPlans) && reduxPlans.length > 0) {
      setMembershipTypes(normalizeMembershipPlans(reduxPlans));
    }
  }, [renewModalVisible, reduxPlans, normalizeMembershipPlans]);

  useEffect(() => {
    if (!renewModalVisible) return;
    dispatch(fetchMembershipPrices())
      .unwrap()
      .catch(() => {
        message.error('Failed to load membership plans');
      });
  }, [renewModalVisible, message, dispatch]);

  const handleOpenRenew = useCallback((record: Member) => {
    setRenewMember(record);
    renewForm.setFieldsValue({ membership: undefined, paidAmount: 0 });
    setRenewModalVisible(true);
  }, [renewForm]);

  const handleRenewModalClose = () => {
    setRenewModalVisible(false);
    setRenewMember(null);
    renewForm.resetFields();
  };

  const handleRenewSubmit = async () => {
    if (!renewMember) return;
    const values = await renewForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await dispatch(renewMemberAsync({
        memberId: renewMember.key,
        data: {
          membership: values.membership,
          planQuantity: values.planQuantity ?? 1,
          paidAmount: values.paidAmount ?? 0,
          membershipStartDate: values.membershipStartDate?.toISOString?.(),
        },
      })).unwrap();
      message.success('Member renewed successfully');
      handleRenewModalClose();
      dispatch(fetchMembers(buildMemberFetchParams(page, pageSize)));
    } catch (err: any) {
      message.error(err?.message || 'Failed to renew member');
    }
  };

  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setSelectedMember(null);
  };

  const handleRowClick = useCallback((record: Member) => {
    setSelectedMemberId(record.key);
    setDetailsModalVisible(true);
  }, []);

  const handleDetailsModalClose = () => {
    setDetailsModalVisible(false);
    setSelectedMemberId(null);
  };

  const loadPageRef = useRef(loadPage);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  loadPageRef.current = loadPage;
  pageRef.current = page;
  pageSizeRef.current = pageSize;

  const handleDelete = useCallback(
    async (record: Member) => {
      try {
        await dispatch(deleteMemberAsync(record.key)).unwrap();
        message.success('Member removed');
        loadPageRef.current(pageRef.current, pageSizeRef.current);
      } catch (err: any) {
        message.error(err?.message || 'Failed to remove member');
      }
    },
    [dispatch, message]
  );

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
        billingAmount: m.billingAmount != null ? String(m.billingAmount) : EMPTY,
        billingDate: m.billingDate ?? EMPTY,
        billingStatus: ((m.billingStatus as string) || 'pending') as 'paid' | 'overdue' | 'pending',
        hasPaymentCard: true,
        isFamilyAccount: false,
        status: ((m.status as string) === 'inactive' || (m.status as string) === 'long term inactive' || (m.status as string) === 'upcoming' ? (m.status as string) : 'active') as Member['status'],
        image: (m as any).image,
      };
    });
  }, [members]);

  const columns: ColumnsType<Member> = useMemo(
    () => [
    {
      title: 'Member',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string, record: Member) => {
        const avatarSrc = getAvatarSrc(record.image);
        const initials = !avatarSrc && text && text !== EMPTY ? text.split(' ').map((n) => n[0]).join('') || '?' : '?';
        const tagColor =
          record.status === 'upcoming'
            ? { bg: '#e6f4ff', border: '#91caff', color: '#1677ff' }
            : record.status === 'inactive' || record.status === 'long term inactive'
              ? { bg: '#fafafa', border: '#d9d9d9', color: '#8c8c8c' }
              : { bg: '#f6ffed', border: '#b7eb8f', color: '#52c41a' };
        return (
          <Space>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: avatarSrc ? 'transparent' : '#1890ff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div>
              <div style={{ fontWeight: 500, color: '#1f1f1f' }}>{text}</div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '0 7px',
                  fontSize: 12,
                  lineHeight: '20px',
                  borderRadius: 4,
                  backgroundColor: tagColor.bg,
                  border: `1px solid ${tagColor.border}`,
                  color: tagColor.color,
                }}
              >
                {record.status === 'upcoming' ? 'UPCOMING' : record.status.toUpperCase()}
              </span>
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
        <Text strong>{record.age || record.age == 0 ? record.age : EMPTY}</Text>
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
            <Text type="secondary" style={{ fontSize: 12 }}>{formatDateDDMMYYYY(record.expiryInfo)}</Text>
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
        <Text type="secondary">{text === EMPTY ? EMPTY : formatDateDDMMYYYY(text)}</Text>
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
                  {record.billingDate === EMPTY ? EMPTY : formatDateDDMMYYYY(record.billingDate)}
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
                    {formatDateDDMMYYYY(record.billingDate)}
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
                    {formatDateDDMMYYYY(record.billingDate)}
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
          {record.status === 'upcoming' && (
            <Tooltip title="Upcoming plan">
              <Button type="text" icon={<ClockCircleOutlined style={{ color: '#1890ff' }} />} disabled />
            </Tooltip>
          )}
          {(record.status === 'inactive' || record.status === 'long term inactive') && (
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
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Remove this member?',
                  okText: 'Yes',
                  cancelText: 'No',
                  onOk: () => handleDelete(record),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ],
    [handleEdit, handleOpenRenew, handleRowClick, handleDelete]
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  if (loading && members.length === 0) {
    return <PageLoader message="Loading members…" />;
  }

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
        loading={loading && members.length > 0}
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

      <Modal
        title="Renew membership"
        open={renewModalVisible}
        onCancel={handleRenewModalClose}
        onOk={handleRenewSubmit}
        confirmLoading={renewLoading}
        okText="Renew"
      >
        {renewMember && (
          <p style={{ marginBottom: 16 }}>
            Renew membership for <strong>{renewMember.name}</strong>.
          </p>
        )}
        <Form form={renewForm} layout="vertical" initialValues={{ paidAmount: 0 }}>
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
          <Form.Item name="membershipStartDate" label="Start date" tooltip="Membership period starts from this date. Leave empty for today.">
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item
            name="paidAmount"
            label="Amount paid (₹)"
            dependencies={['membership']}
            extra={
              renewMaxAmount != null ? (
                <span style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
                  Maximum amount for selected plan: ₹{renewMaxAmount.toLocaleString('en-IN')}
                </span>
              ) : null
            }
            rules={[
              { type: 'number', min: 0, message: 'Amount must be ≥ 0' },
              () => ({
                validator(_: unknown, value: number | string) {
                  if (value == null || value === '' || !membershipTypes.length) return Promise.resolve();
                  const planType = renewForm.getFieldValue('membership');
                  if (!planType) return Promise.resolve();
                  const plan = membershipTypes.find((p: any) => p.type === planType);
                  if (!plan || typeof plan.price !== 'number') return Promise.resolve();
                  const maxAmount = plan.price;
                  if (Number(value) > maxAmount) {
                    return Promise.reject(new Error(`Cannot exceed maximum for selected plan (₹${maxAmount.toLocaleString('en-IN')})`));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber
              min={0}
              step={100}
              style={{ width: '100%' }}
              placeholder={renewMaxAmount != null ? `Max: ₹${renewMaxAmount.toLocaleString('en-IN')}` : 'Enter amount'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MemberTable;
