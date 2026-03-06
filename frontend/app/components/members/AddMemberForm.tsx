'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Upload,
  App,
  Row,
  Col,
  DatePicker,
  Divider,
  InputNumber,
  Card,
  Typography,
} from 'antd';
import {
  UploadOutlined,
  HomeOutlined,
  PhoneOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { useAppDispatch } from '../../redux/hooks';
import { addMember, fetchMembers, normalizeMember } from '../../redux/membersSlice';

const { Option } = Select;
const { Text } = Typography;

interface Branch {
  _id: string;
  name: string;
  status: string;
}

interface AddMemberFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddMemberForm({ onSuccess, onCancel }: AddMemberFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [membershipTypesLoading, setMembershipTypesLoading] = useState(false);
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchMembershipTypes = async () => {
      setMembershipTypesLoading(true);
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
        // Only show active plans for new users; inactive plans remain valid for existing members until expiry
        setMembershipTypes(list.filter((m: any) => m.isActive !== false));
      } catch {
        message.error('Failed to fetch membership types');
      } finally {
        setMembershipTypesLoading(false);
      }
    };
    fetchMembershipTypes();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!user?.gymId) return;
      setBranchesLoading(true);
      try {
        let branchesData: Branch[] = [];
        if (user.role === 'gym_owner') {
          const response = await api.branches.getByGym(user.gymId);
          const rawBranches =
            (response as any)?.branches || (Array.isArray(response) ? response : []);
          branchesData = Array.isArray(rawBranches) ? rawBranches : [];
        } else if (user.role === 'manager' && user.branchId) {
          try {
            const branchResponse = await api.branches.getById(user.branchId);
            const branchDetails = (branchResponse as any)?.data || branchResponse;
            branchesData = [
              {
                _id: branchDetails._id || user.branchId,
                name: branchDetails.name || 'My Branch',
                status: branchDetails.status || 'active',
              },
            ];
          } catch {
            branchesData = [{ _id: user.branchId, name: 'My Branch', status: 'active' }];
          }
        } else {
          const response = await api.branches.getByGym(user.gymId);
          const rawBranches =
            (response as any)?.branches || (Array.isArray(response) ? response : []);
          branchesData = Array.isArray(rawBranches) ? rawBranches : [];
        }
        setBranches(branchesData);
        if (user?.role === 'manager' && branchesData.length > 0) {
          form.setFieldsValue({ branchId: branchesData[0]._id });
        }
      } catch {
        message.error('Failed to fetch branches');
      } finally {
        setBranchesLoading(false);
      }
    };
    fetchBranches();
  }, [user?.gymId, user?.role, user?.branchId, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    let memberId: string | null = null;
    try {
      const formData = new FormData();
      formData.append('firstName', values.firstName);
      formData.append('lastName', values.lastName);
      formData.append('email', values.email);
      formData.append('role', values.role);
      formData.append('branchId', values.branchId);
      if (values.dateOfBirth) {
        const d = values.dateOfBirth instanceof Date ? values.dateOfBirth : new Date(values.dateOfBirth);
        if (!Number.isNaN(d.getTime())) {
          formData.append('dateOfBirth', d.toISOString().split('T')[0]);
        }
      }
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }
      const memberResponse = await api.members.create(formData);
      const raw = (memberResponse as any)?.data ?? memberResponse;
      const memberObj = raw?.member ?? raw;
      memberId = memberObj?.id ?? memberObj?._id;
      if (memberId != null && typeof memberId !== 'string') memberId = String(memberId);
      if (!memberId) throw new Error('Failed to get member ID from response');

      const gender = values.personalGender === 'other' ? 'others' : values.personalGender;
      try {
        await api.membersPersonalDetails.create({
          memberId,
          gender,
          streetAddress: values.streetAddress || '',
          city: values.city || '',
          zipcode: values.zipcode || '',
          state: values.state || '',
          country: values.country || '',
          phoneNumber: values.phoneNumber,
          emergencyContacts: values.emergencyContacts || [],
          dateOfBirth: values.dateOfBirth
            ? new Date(values.dateOfBirth).toISOString().split('T')[0]
            : '',
          membership: values.membership,
          planQuantity: values.planQuantity ?? 1,
          paidAmount: values.paidAmount ? String(values.paidAmount) : '0',
        });
      } catch (detailsErr: any) {
        message.warning(
          detailsErr?.message || 'Member created but membership/personal details could not be saved. You can edit the member to add details.'
        );
      }

      const normalized = normalizeMember(memberObj ?? {}, {
        id: memberId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phoneNumber,
        membership: values.membership,
      });
      dispatch(addMember(normalized));
      try {
        await dispatch(fetchMembers(undefined)).unwrap();
      } catch {
        // e.g. 403 for admin; table still has new member from addMember
      }
      message.success('Member created successfully');
      form.resetFields();
      setFileList([]);
      onSuccess?.();
    } catch (err: any) {
      message.error(err?.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ role: 'member', personalGender: 'male' }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="First Name"
            name="firstName"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Last Name"
            name="lastName"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select placeholder="Select role">
              <Option value="trainer">Trainer</Option>
              <Option value="member">Member</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label="Branch"
        name="branchId"
        rules={[{ required: true, message: 'Please select branch' }]}
      >
        <Select
          placeholder={user?.role === 'manager' ? 'Your branch' : 'Select branch'}
          loading={branchesLoading}
          disabled={branchesLoading || user?.role === 'manager'}
        >
          {branches.map((b) => (
            <Option key={b._id} value={b._id}>
              {b.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="Profile photo" tooltip="Optional. Shown in members list and details.">
        <Upload
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          beforeUpload={() => false}
          accept="image/*"
          listType="picture-card"
          maxCount={1}
        >
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload</div>
          </div>
        </Upload>
      </Form.Item>
      <Divider>Personal details</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Phone Number"
            name="phoneNumber"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Gender"
            name="personalGender"
            rules={[{ required: true, message: 'Please select gender' }]}
          >
            <Select placeholder="Select gender">
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Date of Birth" name="dateOfBirth">
        <DatePicker style={{ width: '100%' }} placeholder="Select date of birth" />
      </Form.Item>
      <Form.Item label="Street Address" name="streetAddress">
        <Input prefix={<HomeOutlined />} placeholder="Enter street address" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="City" name="city">
            <Input placeholder="Enter city" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="State" name="state">
            <Input placeholder="Enter state" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Zipcode" name="zipcode">
            <Input placeholder="Enter zipcode" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Country" name="country">
        <Input placeholder="Enter country" />
      </Form.Item>

      <Divider>Plan & payment</Divider>
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              label="Membership plan"
              name="membership"
              rules={[{ required: true, message: 'Please select a plan' }]}
            >
              <Select
                placeholder="Select plan"
                loading={membershipTypesLoading}
                showSearch
                optionFilterProp="children"
              >
                {membershipTypes.map((m) => (
                  <Option key={m.id || m._id} value={m.type}>
                    {m.type} – ₹{m.price} ({m.duration} days)
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label="Quantity (periods)"
              name="planQuantity"
              initialValue={1}
              tooltip="Consecutive periods; after one ends, the next starts automatically."
              rules={[
                { type: 'number', min: 1, max: 12, message: 'Between 1 and 12' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={12}
                addonAfter="periods"
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) =>
            prev.membership !== curr.membership || prev.planQuantity !== curr.planQuantity
          }
        >
          {() => {
            const plan = membershipTypes.find(
              (m: any) => m.type === form.getFieldValue('membership')
            );
            const qty = form.getFieldValue('planQuantity') || 1;
            const maxAmount =
              plan && typeof plan.price === 'number' ? plan.price * qty : null;
            return maxAmount != null ? (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Maximum amount for selected plan: </Text>
                <Text strong>₹{maxAmount.toLocaleString('en-IN')}</Text>
              </div>
            ) : null;
          }}
        </Form.Item>
        <Form.Item
          label="Paid amount"
          name="paidAmount"
          initialValue={0}
          rules={[
            { type: 'number', min: 0, message: 'Amount must be ≥ 0' },
            () => ({
              validator(_, value) {
                if (value == null || value === '' || !membershipTypes.length) {
                  return Promise.resolve();
                }
                const selectedType = form.getFieldValue('membership');
                const quantity = form.getFieldValue('planQuantity') || 1;
                if (!selectedType) return Promise.resolve();
                const plan = membershipTypes.find((m: any) => m.type === selectedType);
                if (!plan || typeof plan.price !== 'number') return Promise.resolve();
                const maxAmount = plan.price * quantity;
                if (value > maxAmount) {
                  return Promise.reject(
                    new Error(`Cannot exceed maximum (₹${maxAmount.toLocaleString('en-IN')})`),
                  );
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Enter amount (max shown above)"
            min={0}
            addonBefore="₹"
          />
        </Form.Item>
      </Card>
      <Form.List name="emergencyContacts">
        {(fields, { add, remove }) => (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <label style={{ fontWeight: 500 }}>Emergency Contacts</label>
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">
                Add Contact
              </Button>
            </div>
            {fields.map(({ key, name, ...rest }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <Form.Item
                      {...rest}
                      name={[name, 'name']}
                      rules={[{ required: true, message: 'Missing contact name' }]}
                    >
                      <Input placeholder="Contact name" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...rest}
                      name={[name, 'phone']}
                      rules={[{ required: true, message: 'Missing phone number' }]}
                    >
                      <Input placeholder="Phone number" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      {...rest}
                      name={[name, 'relation']}
                      rules={[{ required: true, message: 'Missing relation' }]}
                    >
                      <Select placeholder="Relation">
                        <Option value="spouse">Spouse</Option>
                        <Option value="parent">Parent</Option>
                        <Option value="sibling">Sibling</Option>
                        <Option value="friend">Friend</Option>
                        <Option value="other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Col>
                </Row>
              </div>
            ))}
          </>
        )}
      </Form.List>
      <Form.Item style={{ marginTop: 24 }}>
        <Button type="primary" htmlType="submit" loading={loading} size="large">
          Create Member
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={onCancel}>
          Cancel
        </Button>
      </Form.Item>
    </Form>
  );
}
