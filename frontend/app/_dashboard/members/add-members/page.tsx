'use client';

import React, { useState, useEffect } from 'react';
import { App, Card, Form, Input, Select, Button, Upload, Row, Col, DatePicker, Divider, InputNumber } from 'antd';
import { UploadOutlined, HomeOutlined, PhoneOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../utils/api';
import { mobileRequiredRule, mobilePatternRule, normalizeIndianMobileDigits } from '../../../utils/validation';
import { IndianMobileFormField } from '../../../components/forms/IndianMobileFormField';
import { useMemberFingerprintWebAuthn } from '../../../hooks/useMemberFingerprintWebAuthn';

const { Option } = Select;

interface Branch {
  _id: string;
  name: string;
  status: string;
}

export default function MemberCreationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [membershipTypesLoading, setMembershipTypesLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
   const { message } = App.useApp();

  const { registerFingerprint } = useMemberFingerprintWebAuthn();
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);
  const [fingerprintEnrolling, setFingerprintEnrolling] = useState(false);

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

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[add-member] membership types loaded', { count: list.length });
        }

        setMembershipTypes(list);
      } catch (err) {
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
            branchesData = [{ _id: branchDetails._id || user.branchId, name: branchDetails.name || 'My Branch', status: branchDetails.status || 'active' }];
          } catch {
            branchesData = [{ _id: user.branchId, name: 'My Branch', status: 'active' }];
          }
        } else {
          const response = await api.branches.getByGym(user.gymId);
          const rawBranches =
            (response as any)?.branches || (Array.isArray(response) ? response : []);
          branchesData = Array.isArray(rawBranches) ? rawBranches : [];
        }

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[add-member] branches loaded', { count: branchesData.length });
        }
        setBranches(branchesData);
        if (user?.role === 'manager' && branchesData.length > 0) {
          form.setFieldsValue({ branchId: branchesData[0]._id });
        }
      } catch (err) {
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
      formData.append('phone', normalizeIndianMobileDigits(values.phoneNumber));
      formData.append('role', values.role);
      formData.append('branchId', values.branchId);
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }
      const memberResponse = await api.members.create(formData);
      memberId = (memberResponse as any)?.member?.id || (memberResponse as any)?.member?._id || (memberResponse as any)?.id || (memberResponse as any)?._id;
      if (!memberId) throw new Error('Failed to get member ID from response');

      await api.membersPersonalDetails.create({
        memberId,
        gender: values.personalGender,
        streetAddress: values.streetAddress || '',
        city: values.city || '',
        zipcode: values.zipcode || '',
        state: values.state || '',
        country: values.country || '',
        phoneNumber: values.phoneNumber,
        emergencyContacts: values.emergencyContacts || [],
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString().split('T')[0] : '',
        membership: values.membership,
        paidAmount: values.paidAmount ? String(values.paidAmount) : '0',
      });

      message.success('Member and personal details created successfully!');
      form.resetFields();
      setFileList([]);
      setCreatedMemberId(memberId);
      message.success('Member created. Register fingerprint to enable WebAuthn check-in.');
    } catch (err: any) {
      message.error(err.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFingerprint = async () => {
    if (!createdMemberId || fingerprintEnrolling) return;
    setFingerprintEnrolling(true);
    try {
      const res = await registerFingerprint(createdMemberId);
      if (!res.success) {
        message.error(res.message || 'Fingerprint enrollment failed');
        return;
      }
      message.success('Fingerprint registered successfully!');
      router.push('/members');
    } finally {
      setFingerprintEnrolling(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="Add New Member">
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'trainer', gender: 'male' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="First Name" name="firstName" rules={[{ required: true, message: 'Please enter first name' }]}>
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Last Name" name="lastName" rules={[{ required: true, message: 'Please enter last name' }]}>
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <IndianMobileFormField
                name="phoneNumber"
                label="Mobile number"
                rules={[mobileRequiredRule, mobilePatternRule()]}
                placeholder="Enter 10 Digit Mobile Number"
                addonBefore={
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium tabular-nums select-none">
                    <PhoneOutlined className="opacity-80" />
                    +91
                  </span>
                }
                inputProps={{ inputMode: 'numeric' }}
              />
            </Col>
            <Col span={12}>
              <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Please select role' }]}>
                <Select placeholder="Select role">
                  <Option value="trainer">Trainer</Option>
                  <Option value="member">Member</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Branch" name="branchId" rules={[{ required: true, message: 'Please select branch' }]}>
            <Select placeholder={user?.role === 'manager' ? 'Your branch' : 'Select branch'} loading={branchesLoading} disabled={branchesLoading || user?.role === 'manager'}>
              {branches.map((b) => (
                <Option key={b._id} value={b._id}>{b.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Profile Image">
            <Upload fileList={fileList} onChange={({ fileList: newFileList }) => setFileList(newFileList)} beforeUpload={() => false} multiple={false}>
              <Button icon={<UploadOutlined />}>Upload Image</Button>
            </Upload>
          </Form.Item>
          <Divider>Personal Details</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Gender" name="personalGender" rules={[{ required: true, message: 'Please select gender' }]}>
                <Select placeholder="Select gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Date of Birth" name="dateOfBirth" >
            <DatePicker style={{ width: '100%' }} placeholder="Select date of birth" format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item label="Street Address" name="streetAddress">
            <Input prefix={<HomeOutlined />} placeholder="Enter street address" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="City" name="city"><Input placeholder="Enter city" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="State" name="state"><Input placeholder="Enter state" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Zipcode" name="zipcode"><Input placeholder="Enter zipcode" /></Form.Item>
            </Col>
          </Row>
          <Form.Item label="Country" name="country"><Input placeholder="Enter country" /></Form.Item>
          <Form.Item label="Membership Type" name="membership" rules={[{ required: true, message: 'Please select membership type' }]}>
            <Select placeholder="Select membership type" loading={membershipTypesLoading}>
              {membershipTypes.map((m) => (
                <Option key={m.id || m._id} value={m.type}>{m.type} - ₹{m.price} ({m.duration} days)</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Paid Amount"
            name="paidAmount"
            initialValue={0}
            dependencies={['membership']}
            rules={[
              { type: 'number', min: 0, message: 'Amount must be ≥ 0' },
              () => ({
                validator(_: unknown, value: number | string) {
                  if (value == null || value === '' || !membershipTypes.length) return Promise.resolve();
                  const planType = form.getFieldValue('membership');
                  if (!planType) return Promise.resolve();
                  const plan = membershipTypes.find((m: any) => m.type === planType);
                  if (!plan || typeof plan.price !== 'number') return Promise.resolve();
                  if (Number(value) > plan.price) {
                    return Promise.reject(new Error(`Cannot pay more than expected (₹${plan.price.toLocaleString('en-IN')})`));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="Enter paid amount" min={0} />
          </Form.Item>
          <Form.List name="emergencyContacts">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <label style={{ fontWeight: 500 }}>Emergency Contacts</label>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">Add Contact</Button>
                </div>
                {fields.map(({ key, name, ...rest }) => (
                  <Card key={key} size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Missing contact name' }]}>
                          <Input placeholder="Contact name" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...rest} name={[name, 'phone']} rules={[{ required: true, message: 'Missing phone number' }, mobilePatternRule('Valid 10-digit number (e.g. 9876543210)')]}>
                          <Input placeholder="Phone number" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...rest} name={[name, 'relation']} rules={[{ required: true, message: 'Missing relation' }]}>
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
                        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">Create Member</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => router.push('/members')}>Cancel</Button>
          </Form.Item>

          {createdMemberId && (
            <Form.Item>
              <Button
                type="default"
                block
                loading={fingerprintEnrolling}
                onClick={handleRegisterFingerprint}
              >
                Register Fingerprint
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
}
