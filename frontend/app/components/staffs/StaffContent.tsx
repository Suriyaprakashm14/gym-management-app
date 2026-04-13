'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  App,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Empty,
  Switch,
  Row,
  Col,
  Flex,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageLoader from '../PageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useBranchContext } from '../../contexts/BranchContext';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  createStaffAsync,
  deleteStaffAsync,
  fetchStaffsAsync,
  resetStaffPasswordAsync,
  selectAssignableBranches,
  selectResetStaffPasswordLoading,
  selectStaffs,
  selectStaffsLoading,
  selectStaffsSaving,
  updateStaffAsync,
  updateStaffStatusAsync,
} from '../../redux/staffsSlice';
import { createBranchManagerAsync, selectBranchManagerSaving } from '../../redux/branchesSlice';
import {
  blockNonDigitKeysOnPhoneField,
  indianMobileTenDigitsRule,
  mobileRequiredRule,
  sanitizeIndianMobileDigits,
} from '../../utils/validation';

const { Title, Text } = Typography;

interface AssignableBranch {
  _id: string;
  name: string;
}

interface StaffRecord {
  key: string;
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  branchId: string;
  branchName?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
}

const PAGE_SIZE = 10;

export default function StaffContent() {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const { selectedBranch } = useBranchContext();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'managers' | 'staff'>('all');
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffRecord | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const dispatch = useAppDispatch();
  const staffs = useAppSelector(selectStaffs) as StaffRecord[];
  const assignableBranches = useAppSelector(selectAssignableBranches) as AssignableBranch[];
  const loading = useAppSelector(selectStaffsLoading);
  const submitLoading = useAppSelector(selectStaffsSaving);
  const managerSubmitLoading = useAppSelector(selectBranchManagerSaving);
  const resetPasswordLoading = useAppSelector(selectResetStaffPasswordLoading);

  const isOwner = user?.role === 'gym_owner';

  const fetchStaffs = useCallback(async () => {
    try {
      const params: { branchId?: string; roleFilter?: 'all' | 'staff' | 'managers' } = {};
      if (isOwner && selectedBranch) {
        params.branchId = selectedBranch;
      }
      if (isOwner) {
        params.roleFilter = roleFilter;
      }
      await dispatch(fetchStaffsAsync(params)).unwrap();
    } catch {
      message.error('Failed to load staff');
    }
  }, [dispatch, isOwner, message, selectedBranch, roleFilter]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  const handleCreate = () => {
    form.resetFields();
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await form.validateFields();
      const branchId =
        user?.role === 'gym_owner'
          ? values.branchId
          : user?.branchId;
      const selectedRole = values.userRole === 'manager' ? 'manager' : 'staff';
      const firstName = values.firstName?.trim() ?? '';
      const lastName = values.lastName?.trim() ?? '';
      const phone = values.phone;

      if (selectedRole === 'manager') {
        if (!user?.gymId) {
          message.error('Gym ID not found.');
          return;
        }
        await dispatch(createBranchManagerAsync({
          firstName,
          lastName,
          phone,
          password: values.password,
          gymId: user.gymId,
          branchId,
        })).unwrap();
      } else {
        await dispatch(createStaffAsync({
          firstName,
          lastName,
          phone,
          password: values.password,
          branchId,
        })).unwrap();
      }
      message.success(selectedRole === 'manager' ? 'Manager created successfully' : 'Staff created successfully');
      setCreateModalOpen(false);
      form.resetFields();
      fetchStaffs();
    } catch (err: any) {
      if (err?.errorFields) return;
      const apiMessage =
        (typeof err === 'string' ? err : undefined) ||
        err?.error?.details?.message ||
        err?.details?.message ||
        err?.error?.message ||
        err?.message;
      message.error(apiMessage ?? 'Failed to create user');
    }
  };

  const handleEdit = (record: StaffRecord) => {
    setEditingStaff(record);
    editForm.setFieldsValue({
      firstName: record.firstName,
      lastName: record.lastName,
      status: record.status,
      isActive: record.isActive ?? true,
      branchId: record.branchId || undefined,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingStaff) return;
    try {
      const values = await editForm.validateFields();
      await dispatch(updateStaffAsync({
        id: editingStaff._id,
        data: {
        firstName: values.firstName?.trim(),
        lastName: values.lastName?.trim(),
        status: values.status,
        isActive: values.isActive,
        // Only owners can change branch assignment; managers keep existing branch
        branchId: isOwner ? (values.branchId || undefined) : undefined,
        },
      })).unwrap();
      message.success('Staff updated successfully');
      setEditModalOpen(false);
      setEditingStaff(null);
      fetchStaffs();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message ?? 'Failed to update staff');
    }
  };

  const handleDeactivate = (record: StaffRecord) => {
    const isManagerRole = record.role === 'manager';
    modal.confirm({
      title: isManagerRole ? 'Deactivate Manager?' : 'Deactivate this user?',
      content: isManagerRole
        ? 'This manager will not be able to login.'
        : 'This user will not be able to login.',
      okText: 'Deactivate',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setStatusLoadingId(record._id);
          await dispatch(updateStaffStatusAsync({ userId: record._id, isActive: false })).unwrap();
          message.success('User deactivated');
          fetchStaffs();
        } catch (err: any) {
          message.error(err?.message ?? 'Failed to deactivate');
        } finally {
          setStatusLoadingId(null);
        }
      },
    });
  };

  const handleActivate = async (record: StaffRecord) => {
    try {
      setStatusLoadingId(record._id);
      await dispatch(updateStaffStatusAsync({ userId: record._id, isActive: true })).unwrap();
      message.success('User activated');
      fetchStaffs();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to activate');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteStaffAsync(id)).unwrap();
      message.success('Staff deleted');
      fetchStaffs();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to delete staff');
    }
  };

  const handleOpenResetPassword = (record: StaffRecord) => {
    setResetPasswordStaff(record);
    resetPasswordForm.resetFields();
    setResetPasswordModalOpen(true);
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordStaff) return;
    try {
      const values = await resetPasswordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('Passwords do not match');
        return;
      }
      const res = await dispatch(resetStaffPasswordAsync({
        userId: resetPasswordStaff._id,
        newPassword: values.newPassword,
      })).unwrap();
      const data = res as { success?: boolean; error?: string; message?: string; data?: unknown };
      const success = data?.success === true;
      const errMsg =
        (typeof data?.error === 'string'
          ? data.error
          : (data?.error && typeof data.error === 'object' && 'message' in data.error
              ? (data.error as { message?: string }).message
              : undefined)) ||
        data?.message;
      if (success) {
        message.success('Password reset successfully');
        setResetPasswordModalOpen(false);
        setResetPasswordStaff(null);
        resetPasswordForm.resetFields();
      } else {
        message.error(errMsg || 'Failed to reset password');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message ?? 'Failed to reset password');
    }
  };

  const columns: ColumnsType<StaffRecord> = [
    {
      title: 'Name',
      key: 'name',
      width: 180,
      render: (_, record) => `${record.firstName || ''} ${record.lastName || ''}`.trim() || '—',
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', ellipsis: true, render: (v: string) => (v ? `+91 ${v}` : '—') },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => {
        const r = (role || 'staff').toLowerCase();
        return r === 'manager' ? <Tag color="blue">Manager</Tag> : <Tag>Staff</Tag>;
      },
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 160,
      render: (v: string) => v || '—',
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (v: string) => (v ? dayjs(v).format('DD-MM-YYYY') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Edit
          </Button>
          {isOwner && (
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => handleOpenResetPassword(record)}
            >
              Reset Password
            </Button>
          )}
          {record.isActive ? (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleDeactivate(record)}
              loading={statusLoadingId === record._id}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record)}
              loading={statusLoadingId === record._id}
            >
              Activate
            </Button>
          )}
          {record.role !== 'manager' && (
            <Popconfirm
              title="Delete this staff member? This cannot be undone."
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const branchOptions = assignableBranches.map((b) => ({ label: b.name, value: b._id }));

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Staff</Title>
        </Col>
        <Col>
          <Flex align="center" gap={8}>
            {isOwner && (
              <Select
                value={roleFilter}
                onChange={(v) => setRoleFilter(v)}
                style={{ width: 140 }}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Managers', value: 'managers' },
                  { label: 'Staff', value: 'staff' },
                ]}
              />
            )}
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreate}>
              Create User
            </Button>
          </Flex>
        </Col>
      </Row>

      <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <Table<StaffRecord>
          columns={columns}
          dataSource={staffs}
          loading={loading && staffs.length > 0}
          rowKey="key"
          scroll={{ x: 900 }}
          pagination={
            staffs.length > 0
              ? {
                  pageSize: PAGE_SIZE,
                  showSizeChanger: true,
                  showTotal: (t) => `Total ${t} staff`,
                }
              : false
          }
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No staff found"
                style={{ padding: '32px 0' }}
              >
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Add users using the &quot;Create User&quot; button above.
                </Text>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title="Create User"
        open={createModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={submitLoading || managerSubmitLoading}
        okText="Create"
        rootClassName="staff-modal"
        destroyOnHidden={false}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Form.Item
            name="userRole"
            label="Role"
            initialValue="staff"
            rules={[{ required: true, message: 'Select role' }]}
          >
            <Select
              options={[
                { label: 'Staff', value: 'staff' },
                { label: 'Manager', value: 'manager' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'Enter first name' }]}
          >
            <Input placeholder="First name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Enter last name' }]}
          >
            <Input placeholder="Last name" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            normalize={(v) => sanitizeIndianMobileDigits(v as string)}
            rules={[
              mobileRequiredRule,
              indianMobileTenDigitsRule(),
            ]}
          >
            <Input
              prefix="+91"
              placeholder="9876543210"
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel-national"
              onKeyDown={blockNonDigitKeysOnPhoneField}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Enter password' },
              { min: 6, message: 'At least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
          {isOwner ? (
            <Form.Item
              name="branchId"
              label="Branch Assignment"
              rules={[{ required: true, message: 'Select a branch' }]}
            >
              <Select
                placeholder="Select branch"
                options={branchOptions}
                showSearch
                optionFilterProp="label"
                allowClear
                notFoundContent={
                  assignableBranches.length === 0 && !loading
                    ? 'No branches available'
                    : null
                }
              />
            </Form.Item>
          ) : (
            <>
              {/* Hidden branchId for manager (from their own branch) */}
              <Form.Item
                name="branchId"
                initialValue={user?.branchId}
                hidden
              >
                <Input type="hidden" />
              </Form.Item>
              <Form.Item label="Branch Assignment">
                <Input
                  disabled
                  value={
                    assignableBranches[0]?.name || 'My Branch'
                  }
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="Edit Staff"
        open={editModalOpen}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingStaff(null);
        }}
        confirmLoading={submitLoading}
        okText="Update"
        rootClassName="staff-modal"
        destroyOnHidden={false}
        width={480}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'Enter first name' }]}
          >
            <Input placeholder="First name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Enter last name' }]}
          >
            <Input placeholder="Last name" />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Frozen', value: 'frozen' },
              ]}
            />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
          {isOwner ? (
            <Form.Item name="branchId" label="Branch Assignment">
              <Select
                placeholder="Select branch"
                options={branchOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          ) : (
            editingStaff && (
              <Form.Item label="Branch Assignment">
                <Input
                  disabled
                  value={
                    editingStaff.branchName ||
                    assignableBranches.find(
                      (b) => b._id === editingStaff.branchId
                    )?.name ||
                    'My Branch'
                  }
                />
              </Form.Item>
            )
          )}
        </Form>
      </Modal>

      <Modal
        title="Reset Password"
        open={resetPasswordModalOpen}
        onOk={() => resetPasswordForm.submit()}
        onCancel={() => {
          setResetPasswordModalOpen(false);
          setResetPasswordStaff(null);
          resetPasswordForm.resetFields();
        }}
        confirmLoading={resetPasswordLoading}
        okText="Reset Password"
        rootClassName="staff-modal"
        width={400}
      >
        {resetPasswordStaff && (
          <p style={{ marginBottom: 16 }}>
            Set a new password for{' '}
            <strong>
              {resetPasswordStaff.firstName} {resetPasswordStaff.lastName}
            </strong>{' '}
            ({resetPasswordStaff.phone ? `+91 ${resetPasswordStaff.phone}` : 'No phone'}).
          </p>
        )}
        <Form form={resetPasswordForm} layout="vertical" onFinish={handleResetPasswordSubmit}>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Enter new password' },
              { min: 6, message: 'At least 6 characters' },
            ]}
          >
            <Input.Password placeholder="New password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
