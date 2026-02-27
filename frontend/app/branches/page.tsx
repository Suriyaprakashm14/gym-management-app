'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';

const { Content } = Layout;
import Sidebar from '../components/sidebars/Sidebar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { 
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
  message,
  Popconfirm,
  Tooltip,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

interface Branch {
  key: string;
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
  managerId?: string;
  managerName?: string;
  memberCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BranchFormData {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
}

interface ManagerFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gymId: string;
  branchId: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [form] = Form.useForm();
  const [managerForm] = Form.useForm();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      console.log('Current user:', user);
      console.log('User gymId:', user?.gymId);
      
      if (!user?.gymId) {
        message.error('Gym ID not found. Please login again.');
        return;
      }
      
      console.log('Fetching branches for gym ID:', user.gymId);
      const response = await api.branches.getByGym(user.gymId);
      console.log('Branches response:', response);

      const branchList = Array.isArray(response)
        ? response
        : response?.branches && Array.isArray(response.branches)
          ? response.branches
          : response?.data?.branches && Array.isArray(response.data.branches)
            ? response.data.branches
            : [];

      if (branchList.length === 0) {
        setBranches([]);
        message.info('No branches found for this gym. Click "Add Branch" to create your first branch.');
        return;
      }

      const branchesData = branchList.map((branch: any) => ({
        key: branch._id,
        ...branch,
      }));
      setBranches(branchesData);
      return;
      
      console.log('No branches found or invalid response format');
      setBranches([]);
      message.info('No branches found for this gym. Click "Add Branch" to create your first branch.');
      
    } catch (err) {
      console.error('Error fetching branches:', err);
      message.error('Failed to fetch branches');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.gymId) {
      fetchBranches();
    } else {
      console.log('No gymId found, setting empty branches array');
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
    form.setFieldsValue({
      name: branch.name,
      'address.street': branch.address.street,
      'address.city': branch.address.city,
      'address.state': branch.address.state,
      'address.zipCode': branch.address.zipCode,
      'address.country': branch.address.country,
      'contactInfo.phone': branch.contactInfo.phone,
      'contactInfo.email': branch.contactInfo.email,
    });
    setModalVisible(true);
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      await api.branches.delete(branchId);
      message.success('Branch deleted successfully');
      fetchBranches();
    } catch (err) {
      message.error('Failed to delete branch');
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      if (!user?.gymId) {
        message.error('Gym ID not found. Please login again.');
        return;
      }

      // Transform form data to match API structure
      const branchData: BranchFormData = {
        name: values.name,
        address: {
          street: values['address.street'],
          city: values['address.city'],
          state: values['address.state'],
          zipCode: values['address.zipCode'],
          country: values['address.country'],
        },
        contactInfo: {
          phone: values['contactInfo.phone'],
          email: values['contactInfo.email'],
        }
      };

      if (editingBranch) {
        // Update existing branch
        await api.branches.update(editingBranch._id, branchData);
        message.success('Branch updated successfully');
      } else {
        // Create new branch
        console.log('Creating branch for gym ID:', user.gymId, 'with data:', branchData);
        await api.branches.create(user.gymId, branchData);
        message.success('Branch created successfully');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchBranches();
    } catch (err) {
      console.error('Error saving branch:', err);
      message.error(editingBranch ? 'Failed to update branch' : 'Failed to create branch');
    }
  };

  const handleManagerSubmit = async (values: ManagerFormData) => {
    try {
      if (!user?.gymId || !selectedBranch) {
        message.error('Gym ID or branch not found. Please try again.');
        return;
      }

      const managerData = {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        gymId: user.gymId,
        branchId: selectedBranch._id
      };

      await api.auth.createManager(managerData);

      message.success('Manager created successfully');
      setManagerModalVisible(false);
      managerForm.resetFields();
      fetchBranches(); // Refresh to show updated manager info
    } catch (err) {
      console.error('Error creating manager:', err);
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
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            backgroundColor: '#1890ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            <HomeOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Tag color={record.isActive ? 'success' : 'default'}>
              {record.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Tag>
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
        // Handle both string and object address formats
        let addressText = '';
        if (typeof address === 'string') {
          addressText = address;
        } else if (typeof address === 'object' && address !== null) {
          // Handle object format: {street, city, state, zipCode, country}
          const parts = [];
          if (address.street) parts.push(address.street);
          if (address.city) parts.push(address.city);
          if (address.state) parts.push(address.state);
          if (address.zipCode) parts.push(address.zipCode);
          if (address.country) parts.push(address.country);
          addressText = parts.join(', ');
        } else {
          addressText = 'No address provided';
        }
        
        return (
          <Space size={4}>
            <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ fontSize: 13 }}>{addressText}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_: unknown, record: Branch) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <PhoneOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ fontSize: 13 }}>{record.contactInfo.phone}</Text>
          </Space>
          <Space size={4}>
            <MailOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ fontSize: 13 }}>{record.contactInfo.email}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Manager',
      dataIndex: 'managerName',
      key: 'manager',
      width: 150,
      render: (managerName: string) => (
        <Space size={4}>
          <TeamOutlined style={{ color: '#8c8c8c' }} />
          <Text style={{ fontSize: 13 }}>{managerName || 'Not Assigned'}</Text>
        </Space>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      render: (count: number) => (
        <Text strong>{count || 0}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Branch) => (
        <Space size={8}>
          <Tooltip title="Create Manager">
            <Button
              type="text"
              icon={<UserAddOutlined style={{ color: '#52c41a' }} />}
              onClick={() => handleCreateManager(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#13c2c2' }} />}
              onClick={() => handleEditBranch(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this branch?"
              onConfirm={() => handleDeleteBranch(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'admin']}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout 
          style={{ 
            background: '#f0f2f5',
            marginLeft: collapsed ? 80 : 200, // Account for sidebar width
            transition: 'margin-left 0.2s'
          }}
        >
          <Content style={{ margin: 0, paddingBottom: 100 }}>
            <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                Branches Management
              </Title>
              <Text type="secondary">Manage your gym branches and locations</Text>
            </div>

            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Total Branches"
                    value={branches.length}
                    prefix={<HomeOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Active Branches"
                    value={branches.filter(b => b.isActive).length}
                    prefix={<HomeOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Total Members"
                    value={branches.reduce((sum, b) => sum + (b.memberCount || 0), 0)}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Branches Table */}
            <Card>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16 
              }}>
                <Title level={4} style={{ margin: 0 }}>
                  All Branches ({branches.length})
                </Title>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddBranch}
                  style={{
                    backgroundColor: '#13c2c2',
                    borderColor: '#13c2c2',
                  }}
                >
                  Add Branch
                </Button>
              </div>

              <Table
                columns={columns}
                dataSource={branches}
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} branches`,
                }}
                scroll={{ x: 1000 }}
                style={{ background: '#fff' }}
              />
            </Card>

            {/* Add/Edit Branch Modal */}
            <Modal
              title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              onOk={() => form.submit()}
              okText={editingBranch ? 'Update' : 'Create'}
              cancelText="Cancel"
              width={600}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleModalSubmit}
              >
                <Form.Item
                  name="name"
                  label="Branch Name"
                  rules={[{ required: true, message: 'Please enter branch name' }]}
                >
                  <Input placeholder="Enter branch name" />
                </Form.Item>

                <Title level={5}>Address</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="address.street"
                      label="Street"
                      rules={[{ required: true, message: 'Please enter street address' }]}
                    >
                      <Input placeholder="Enter street address" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="address.city"
                      label="City"
                      rules={[{ required: true, message: 'Please enter city' }]}
                    >
                      <Input placeholder="Enter city" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="address.state"
                      label="State"
                      rules={[{ required: true, message: 'Please enter state' }]}
                    >
                      <Input placeholder="Enter state" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="address.zipCode"
                      label="Zip Code"
                      rules={[{ required: true, message: 'Please enter zip code' }]}
                    >
                      <Input placeholder="Enter zip code" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="address.country"
                      label="Country"
                      rules={[{ required: true, message: 'Please enter country' }]}
                    >
                      <Input placeholder="Enter country" />
                    </Form.Item>
                  </Col>
                </Row>

                <Title level={5}>Contact Information</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="contactInfo.phone"
                      label="Phone Number"
                      rules={[
                        { required: true, message: 'Please enter phone number' },
                        { pattern: /^[\+]?[1-9][\d]{0,15}$/, message: 'Please enter a valid phone number' }
                      ]}
                    >
                      <Input placeholder="Enter phone number" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="contactInfo.email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Please enter email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input placeholder="Enter email address" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Modal>

            {/* Create Manager Modal */}
            <Modal
              title={`Create Manager for ${selectedBranch?.name || 'Branch'}`}
              open={managerModalVisible}
              onCancel={() => {
                setManagerModalVisible(false);
                managerForm.resetFields();
              }}
              onOk={() => managerForm.submit()}
              okText="Create Manager"
              cancelText="Cancel"
              width={500}
            >
              <Form
                form={managerForm}
                layout="vertical"
                onFinish={handleManagerSubmit}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="firstName"
                      label="First Name"
                      rules={[{ required: true, message: 'Please enter first name' }]}
                    >
                      <Input placeholder="Enter first name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="lastName"
                      label="Last Name"
                      rules={[{ required: true, message: 'Please enter last name' }]}
                    >
                      <Input placeholder="Enter last name" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input placeholder="Enter email address" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password placeholder="Enter password" />
                </Form.Item>

                <div style={{ 
                  padding: '12px', 
                  background: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <strong>Branch:</strong> {selectedBranch?.name}<br/>
                    <strong>Gym ID:</strong> {user?.gymId}
                  </Text>
                </div>
              </Form>
            </Modal>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ProtectedRoute>
  );
}