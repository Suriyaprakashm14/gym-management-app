'use client';

import React, { useState, useEffect } from 'react';
import {
  App,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Card,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Popconfirm,
  Tooltip,
  Statistic,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  TeamOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

interface BranchManager {
  id: string;
  name: string;
  email?: string;
}

interface Branch {
  key: string;
  _id: string;
  name: string;
  address: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
  contactInfo?: { phone?: string };
  managers?: BranchManager[];
  memberCount?: number;
  isActive: boolean;
}

interface BranchFormData {
  name: string;
  address: { street: string; city: string; state: string; zipCode: string; country: string };
  contactInfo: { phone: string };
}

interface ManagerFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gymId: string;
  branchId: string;
}

export default function BranchesContent() {
  const { message } = App.useApp();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [form] = Form.useForm();
  const [managerForm] = Form.useForm();
  const { user } = useAuth();

  const fetchBranches = async () => {
    if (!user?.gymId) {
      message.error('Gym ID not found. Please login again.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.branches.getByGym(user.gymId);
      const branchList = Array.isArray(response)
        ? response
        : (response as any)?.data?.branches ?? (response as any)?.branches ?? [];
      const branchesData = (branchList as any[]).map((b: any) => {
        const managers = b.branchManagers ?? (b.branchManager ? [b.branchManager] : []);
        const managerList = Array.isArray(managers)
          ? managers.map((m: any) => ({
              id: m.id ?? m._id,
              name: m.name ?? (((`${m.firstName || ''} ${m.lastName || ''}`.trim()) || m.email) || 'Manager'),
              email: m.email,
            }))
          : [];
        return {
          key: b._id,
          ...b,
          managers: managerList,
        };
      });
      setBranches(branchesData);
    } catch (err) {
      message.error('Failed to load branches. Please try again.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.gymId) fetchBranches();
    else {
      setBranches([]);
      setLoading(false);
    }
  }, [user?.gymId]);

  const handleAddBranch = () => {
    setEditingBranch(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleCreateManager = (branch: Branch) => {
    setSelectedBranch(branch);
    managerForm.resetFields();
    setManagerModalVisible(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    const addr = branch.address ?? {};
    const contact = branch.contactInfo ?? {};
    form.setFieldsValue({
      name: branch.name ?? '',
      'address.street': addr.street ?? '',
      'address.city': addr.city ?? '',
      'address.state': addr.state ?? '',
      'address.zipCode': addr.zipCode ?? '',
      'address.country': addr.country ?? '',
      'contactInfo.phone': contact.phone ?? '',
    });
    setModalVisible(true);
  };

  const handleDeleteBranch = (branchId: string) => {
    api.branches
      .delete(branchId)
      .then(() => {
        message.success('Branch deleted successfully');
        fetchBranches();
      })
      .catch(() => {
        message.error('Unable to delete branch');
      });
  };

  const handleModalSubmit = async (values: any) => {
    if (!user?.gymId) {
      message.error('Gym ID not found.');
      return;
    }
    const branchData: BranchFormData = {
      name: values.name,
      address: {
        street: values['address.street'],
        city: values['address.city'],
        state: values['address.state'],
        zipCode: values['address.zipCode'],
        country: values['address.country'],
      },
      contactInfo: { phone: values['contactInfo.phone'] },
    };
    try {
      if (editingBranch) {
        await api.branches.update(editingBranch._id, branchData);
        setModalVisible(false);
        setEditingBranch(null);
        form.resetFields();
        await fetchBranches();
        message.success('Branch updated successfully');
      } else {
        await api.branches.create(user.gymId, branchData);
        setModalVisible(false);
        setEditingBranch(null);
        form.resetFields();
        await fetchBranches();
        message.success('Branch created successfully');
      }
    } catch (err) {
      message.error(editingBranch ? 'Failed to update branch' : 'Failed to create branch');
    }
  };

  const handleManagerSubmit = async (values: ManagerFormData) => {
    if (!user?.gymId || !selectedBranch) {
      message.error('Gym ID or branch not found.');
      return;
    }
    try {
      await api.auth.createManager({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        gymId: user.gymId,
        branchId: selectedBranch._id,
      });
      message.success('Manager created successfully');
      setManagerModalVisible(false);
      managerForm.resetFields();
      fetchBranches();
    } catch (err) {
      message.error('Failed to create manager');
    }
  };

  const columns: ColumnsType<Branch> = [
    {
      title: 'Branch',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Branch) => (
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            <HomeOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Tag color={record.isActive ? 'success' : 'default'}>{record.isActive ? 'ACTIVE' : 'INACTIVE'}</Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      render: (address: any) => {
        if (!address) return <Text type="secondary">No address</Text>;
        const text = typeof address === 'string' ? address : [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(', ');
        return (
          <Space size={4}>
            <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ fontSize: 13 }}>{text || 'No address provided'}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 160,
      render: (_: unknown, record: Branch) => (
        <Space size={4}>
          <PhoneOutlined style={{ color: '#8c8c8c' }} />
          <Text style={{ fontSize: 13 }}>{record.contactInfo?.phone || '—'}</Text>
        </Space>
      ),
    },
    {
      title: 'Manager',
      key: 'manager',
      width: 200,
      render: (_: unknown, record: Branch) => {
        const managers = record.managers ?? [];
        if (managers.length === 0) {
          return (
            <Space size={4}><TeamOutlined style={{ color: '#8c8c8c' }} /><Text style={{ fontSize: 13 }} type="secondary">Not Assigned</Text></Space>
          );
        }
        return (
          <Space size={4} wrap>
            <TeamOutlined style={{ color: '#8c8c8c' }} />
            {managers.map((m) => (
              <Tag key={m.id}>{m.name}</Tag>
            ))}
          </Space>
        );
      },
    },
    // Status column removed per requirements
    { title: 'Members', dataIndex: 'memberCount', key: 'memberCount', width: 100, render: (c: number) => <Text strong>{c || 0}</Text> },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Branch) => (
        <Space size={8}>
          <Tooltip title="Create Manager"><Button type="text" icon={<UserAddOutlined style={{ color: '#52c41a' }} />} onClick={() => handleCreateManager(record)} /></Tooltip>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined style={{ color: '#13c2c2' }} />} onClick={() => handleEditBranch(record)} /></Tooltip>
          <Popconfirm title="Are you sure you want to delete this branch?" onConfirm={() => handleDeleteBranch(record._id)} okText="Yes" cancelText="No">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!user?.gymId) {
    return (
      <div style={{ padding: 24 }}>
        <Text type="secondary">Gym ID not found. Please log in again.</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>Branches Management</Title>
        <Text type="secondary">Manage your gym branches and locations</Text>
      </div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="Total Branches" value={branches.length} prefix={<HomeOutlined />} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Active Branches" value={branches.filter((b) => b.isActive).length} prefix={<HomeOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Total Members" value={branches.reduce((s, b) => s + (b.memberCount || 0), 0)} prefix={<TeamOutlined />} valueStyle={{ color: '#722ed1' }} /></Card></Col>
      </Row>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>All Branches ({branches.length})</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBranch} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>Add Branch</Button>
        </div>
        <Table
          columns={columns}
          dataSource={branches}
          loading={loading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span>No branches found</span>}
                style={{ padding: '32px 0' }}
              >
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Add your first branch using the button above.
                </Text>
              </Empty>
            ),
          }}
          pagination={branches.length > 0 ? { pageSize: 10, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} branches` } : false}
          sticky
          scroll={{ x: 1000, y: 500 }}
        />
      </Card>
      <Modal title={editingBranch ? 'Edit Branch' : 'Add New Branch'} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingBranch(null); form.resetFields(); }} onOk={() => form.submit()} okText={editingBranch ? 'Update' : 'Create'} cancelText="Cancel" width={600}>
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
          <Form.Item name="name" label="Branch Name" rules={[{ required: true, message: 'Please enter branch name' }]}><Input placeholder="Enter branch name" /></Form.Item>
          <Title level={5}>Address</Title>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="address.street" label="Street" rules={[{ required: true }]}><Input placeholder="Street" /></Form.Item></Col>
            <Col span={12}><Form.Item name="address.city" label="City" rules={[{ required: true }]}><Input placeholder="City" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="address.state" label="State" rules={[{ required: true }]}><Input placeholder="State" /></Form.Item></Col>
            <Col span={8}><Form.Item name="address.zipCode" label="Zip Code" rules={[{ required: true }]}><Input placeholder="Zip" /></Form.Item></Col>
            <Col span={8}><Form.Item name="address.country" label="Country" rules={[{ required: true }]}><Input placeholder="Country" /></Form.Item></Col>
          </Row>
          <Title level={5}>Contact</Title>
          <Form.Item name="contactInfo.phone" label="Phone" rules={[{ required: true, message: 'Please enter phone' }]}><Input placeholder="Phone" /></Form.Item>
        </Form>
      </Modal>
      <Modal title={`Create Manager for ${selectedBranch?.name || 'Branch'}`} open={managerModalVisible} onCancel={() => { setManagerModalVisible(false); managerForm.resetFields(); }} onOk={() => managerForm.submit()} okText="Create Manager" cancelText="Cancel" width={500}>
        <Form form={managerForm} layout="vertical" onFinish={handleManagerSubmit}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input placeholder="First name" /></Form.Item></Col>
            <Col span={12}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input placeholder="Last name" /></Form.Item></Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input placeholder="Email" /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 6 }]}><Input.Password placeholder="Password" /></Form.Item>
          <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}><strong>Branch:</strong> {selectedBranch?.name}<br /><strong>Gym ID:</strong> {user?.gymId}</Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
