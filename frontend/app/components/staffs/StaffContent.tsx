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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

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
  email: string;
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
  const { message } = App.useApp();
  const { user } = useAuth();
  const [staffs, setStaffs] = useState<StaffRecord[]>([]);
  const [assignableBranches, setAssignableBranches] = useState<AssignableBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const isOwner = user?.role === 'gym_owner';
  const isManager = user?.role === 'manager';

  const fetchStaffs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.staffs.getStaffs();
      const data = (response as any)?.data ?? response;
      const list = Array.isArray(data?.staffs) ? data.staffs : [];
      const branches = Array.isArray(data?.assignableBranches) ? data.assignableBranches : [];
      setStaffs(
        list.map((s: any) => ({
          key: s._id,
          _id: s._id,
          firstName: s.firstName ?? '',
          lastName: s.lastName ?? '',
          email: s.email ?? '',
          role: s.role ?? 'staff',
          branchId: s.branchId ?? '',
          branchName: s.branchName ?? '—',
          status: s.status ?? 'active',
          isActive: s.isActive !== false,
          createdAt: s.createdAt ?? '',
          createdBy: s.createdBy ?? null,
        }))
      );
      setAssignableBranches(branches);
    } catch (err) {
      message.error('Failed to load staff');
      setStaffs([]);
      setAssignableBranches([]);
    } finally {
      setLoading(false);
    }
  }, [message]);

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
      setSubmitLoading(true);
      const branchId =
        user?.role === 'gym_owner'
          ? values.branchId
          : user?.branchId;

      await api.staffs.createStaff({
        firstName: values.firstName?.trim() ?? '',
        lastName: values.lastName?.trim() ?? '',
        email: values.email?.trim() ?? '',
        password: values.password,
        branchId,
      });
      message.success('Staff created successfully');
      setCreateModalOpen(false);
      fetchStaffs();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message ?? 'Failed to create staff');
    } finally {
      setSubmitLoading(false);
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
      setSubmitLoading(true);
      await api.staffs.updateStaff(editingStaff._id, {
        firstName: values.firstName?.trim(),
        lastName: values.lastName?.trim(),
        status: values.status,
        isActive: values.isActive,
        // Only owners can change branch assignment; managers keep existing branch
        branchId: isOwner ? (values.branchId || undefined) : undefined,
      });
      message.success('Staff updated successfully');
      setEditModalOpen(false);
      setEditingStaff(null);
      fetchStaffs();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message ?? 'Failed to update staff');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeactivate = async (record: StaffRecord) => {
    try {
      await api.staffs.updateStaff(record._id, { isActive: false, status: 'inactive' });
      message.success('Staff deactivated');
      fetchStaffs();
    } catch (err) {
      message.error('Failed to deactivate staff');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.staffs.deleteStaff(id);
      message.success('Staff deleted');
      fetchStaffs();
    } catch (err) {
      message.error('Failed to delete staff');
    }
  };

  const columns: ColumnsType<StaffRecord> = [
    {
      title: 'Name',
      key: 'name',
      width: 180,
      render: (_, record) => `${record.firstName || ''} ${record.lastName || ''}`.trim() || '—',
    },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => <Tag color="blue">{role || 'staff'}</Tag>,
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
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (v: string) => (v ? dayjs(v).format('DD MMM YYYY') : '—'),
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
          {record.isActive && (
            <Popconfirm
              title="Deactivate this staff member?"
              onConfirm={() => handleDeactivate(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" size="small" icon={<StopOutlined />}>
                Deactivate
              </Button>
            </Popconfirm>
          )}
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
        </Space>
      ),
    },
  ];

  const branchOptions = assignableBranches.map((b) => ({ label: b.name, value: b._id }));

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: 4 }}>
            Staff
          </Title>
          <Text type="secondary">Manage staff members, roles, and branch assignments</Text>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreate}>
          Create Staff
        </Button>
      </div>

      <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <Table<StaffRecord>
          columns={columns}
          dataSource={staffs}
          loading={loading}
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
                  Add staff using the &quot;Create Staff&quot; button above.
                </Text>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title="Create Staff"
        open={createModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={submitLoading}
        okText="Create"
        destroyOnHidden={false}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
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
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input type="email" placeholder="email@example.com" />
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
    </div>
  );
}
