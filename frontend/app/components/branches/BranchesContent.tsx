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
  Flex,
  Modal,
  Form,
  Input,
  Select,
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageLoader from '../PageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchBranchesAsync,
  createBranchAsync,
  updateBranchAsync,
  deleteBranchAsync,
  selectBranches,
  selectBranchesLoading,
  selectBranchesSaving,
  selectBranchesDeleting,
  type Branch,
} from '../../redux/branchesSlice';
import {
  mobileRequiredRule,
  sanitizeIndianMobileDigits,
  indianMobileTenDigitsRule,
  blockNonDigitKeysOnPhoneField,
  parseIndianMobileToTenDigits,
} from '../../utils/validation';
import {
  getCountryOptions,
  getStateOptions,
  getCityOptions,
  hasCityOptions,
  getCityName,
  getStateName,
  getCountryName,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_STATE_CODE,
  DEFAULT_CITY_CODE,
} from '../../utils/addressOptions';

const { Title, Text } = Typography;

const COUNTRY_OPTIONS = getCountryOptions();

export default function BranchesContent() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const branches = useAppSelector(selectBranches);
  const loading = useAppSelector(selectBranchesLoading);
  const saving = useAppSelector(selectBranchesSaving);
  const deleting = useAppSelector(selectBranchesDeleting);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [selectedState, setSelectedState] = useState<string>(DEFAULT_STATE_CODE);
  const [form] = Form.useForm();

  const stateOptions = React.useMemo(() => getStateOptions(selectedCountry), [selectedCountry]);
  const cityOptions = React.useMemo(() => getCityOptions(selectedState), [selectedState]);
  const showCitySelect = hasCityOptions(selectedState);

  useEffect(() => {
    if (user?.gymId) {
      dispatch(fetchBranchesAsync(user.gymId));
    }
  }, [dispatch, user?.gymId]);

  const handleAddBranch = () => {
    setEditingBranch(null);
    setSelectedCountry(DEFAULT_COUNTRY_CODE);
    setSelectedState(DEFAULT_STATE_CODE);
    form.resetFields();
    form.setFieldsValue({
      'address.country': DEFAULT_COUNTRY_CODE,
      'address.state': DEFAULT_STATE_CODE,
      'address.city': DEFAULT_CITY_CODE,
    });
    setModalVisible(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    const addr = branch.address ?? {};
    const contact = branch.contactInfo ?? {};
    const country = addr.country || DEFAULT_COUNTRY_CODE;
    const state = addr.state || DEFAULT_STATE_CODE;
    setSelectedCountry(country);
    setSelectedState(state);
    form.setFieldsValue({
      name: branch.name ?? '',
      'address.street': addr.street ?? '',
      'address.city': addr.city ?? '',
      'address.state': state,
      'address.zipCode': addr.zipCode ?? '',
      'address.country': country,
      'contactInfo.phone': parseIndianMobileToTenDigits(contact.phone ?? ''),
    });
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingBranch(null);
    form.resetFields();
  };

  const handleModalSubmit = async (values: any) => {
    if (!user?.gymId) { message.error('Gym ID not found.'); return; }
    const branchData = {
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
        await dispatch(updateBranchAsync({ branchId: editingBranch._id, data: branchData })).unwrap();
        message.success('Branch updated successfully');
      } else {
        await dispatch(createBranchAsync({ gymId: user.gymId, data: branchData })).unwrap();
        message.success('Branch created successfully');
      }
      handleModalClose();
      dispatch(fetchBranchesAsync(user.gymId));
    } catch (err: any) {
      message.error(err?.message ?? (editingBranch ? 'Failed to update branch' : 'Failed to create branch'));
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      await dispatch(deleteBranchAsync(branchId)).unwrap();
      message.success('Branch deleted successfully');
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : '';
      if (msg.includes('Branch has users or members')) {
        message.error('Cannot delete this branch while it still has managers or members. Please remove or reassign them first.');
      } else if (msg.includes('Cannot delete branch')) {
        message.error(msg);
      } else {
        message.error(msg || 'Unable to delete branch');
      }
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
        const text = typeof address === 'string'
          ? address
          : [
              address.street,
              getCityName(address.city) || address.city,
              getStateName(address.state) || address.state,
              address.zipCode,
              getCountryName(address.country) || address.country,
            ].filter(Boolean).join(', ');
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
            <Space size={4}>
              <TeamOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ fontSize: 13 }} type="secondary">Not Assigned</Text>
            </Space>
          );
        }
        return (
          <Space size={4} wrap>
            <TeamOutlined style={{ color: '#8c8c8c' }} />
            {managers.map((m) => <Tag key={m.id}>{m.name}</Tag>)}
          </Space>
        );
      },
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      render: (c: number) => <Text strong>{c || 0}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: Branch) => (
        <Space size={8}>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined style={{ color: '#13c2c2' }} />} onClick={() => handleEditBranch(record)} />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this branch?"
            onConfirm={() => handleDeleteBranch(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} loading={deleting} />
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

  if (loading && branches.length === 0) {
    return <PageLoader message="Loading branches…" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Branches Management</Title>
        </Col>
        <Col>
          <Flex align="center" gap={8}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBranch}>
              Add Branch
            </Button>
          </Flex>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total Branches" value={branches.length} prefix={<HomeOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Active Branches" value={branches.filter((b) => b.isActive).length} prefix={<HomeOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total Members" value={branches.reduce((s, b) => s + (b.memberCount || 0), 0)} prefix={<TeamOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={branches}
          loading={loading && branches.length > 0}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span>No branches found</span>} style={{ padding: '32px 0' }}>
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

      {/* Add / Edit Branch Modal */}
      <Modal
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        open={modalVisible}
        onCancel={handleModalClose}
        onOk={() => form.submit()}
        okText={editingBranch ? 'Update' : 'Create'}
        confirmLoading={saving}
        cancelText="Cancel"
        width={600}
        destroyOnHidden={false}
        rootClassName="branch-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
          <Form.Item name="name" label="Branch Name" rules={[{ required: true, message: 'Please enter branch name' }]}>
            <Input placeholder="Enter branch name" />
          </Form.Item>

          <Title level={5}>Address</Title>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="address.street" label="Street" rules={[{ required: true, message: 'Enter street' }]}>
                <Input placeholder="Street / Area / Locality" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="address.country" label="Country" rules={[{ required: true, message: 'Select country' }]} initialValue={DEFAULT_COUNTRY_CODE}>
                <Select
                  options={COUNTRY_OPTIONS}
                  placeholder="Select country"
                  showSearch
                  optionFilterProp="label"
                  onChange={(val) => {
                    setSelectedCountry(val);
                    setSelectedState('');
                    form.setFieldValue('address.state', undefined);
                    form.setFieldValue('address.city', undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address.state" label="State" rules={[{ required: true, message: 'Select state' }]}>
                <Select
                  options={stateOptions}
                  placeholder="Select state"
                  showSearch
                  optionFilterProp="label"
                  onChange={(val) => {
                    setSelectedState(val);
                    const firstCity = getCityOptions(val)[0]?.value;
                    form.setFieldValue('address.city', firstCity ?? undefined);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="address.city" label="City" rules={[{ required: true, message: 'Enter city' }]}>
                {showCitySelect ? (
                  <Select
                    options={cityOptions}
                    placeholder="Select city"
                    showSearch
                    optionFilterProp="label"
                  />
                ) : (
                  <Input placeholder="City" />
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address.zipCode" label="Zip / Pin Code" rules={[{ required: true, message: 'Enter zip code' }]}>
                <Input placeholder="600001" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5}>Contact</Title>
          <Form.Item
            name="contactInfo.phone"
            label="Phone"
            normalize={(v) => sanitizeIndianMobileDigits(v as string)}
            rules={[mobileRequiredRule, indianMobileTenDigitsRule()]}
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
        </Form>
      </Modal>
    </div>
  );
}
