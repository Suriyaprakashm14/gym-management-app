"use client";

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Upload, message, Row, Col, DatePicker, Divider, InputNumber } from 'antd';
import { UserOutlined, UploadOutlined, HomeOutlined, PhoneOutlined, ContactsOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../../redux/hooks';
import { createMember } from '../../redux/membersSlice';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { Option } = Select;

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branchId: string;
  profile: {
    age: number;
    phone: string;
    gender: string;
  };
  image?: File;
  // Personal Details
  personalDetails?: {
    gender: string;
    streetAddress: string;
    city: string;
    zipcode: string;
    state: string;
    country: string;
    phoneNumber: string;
    emergencyContacts: Array<{
      name: string;
      phone: string;
      relation: string;
    }>;
    dateOfBirth: string;
    membership: string;
    paidAmount: number;
  };
}

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
  const [mounted, setMounted] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAuth();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch membership types
  useEffect(() => {
    const fetchMembershipTypes = async () => {
      setMembershipTypesLoading(true);
      try {
        const response = await api.membershipPrices.getAll();
        const types = response;
        setMembershipTypes(types);
      } catch (error: any) {
        console.error('Error fetching membership types:', error);
        message.error('Failed to fetch membership types');
      } finally {
        setMembershipTypesLoading(false);
      }
    };

    fetchMembershipTypes();
  }, []);

  // Fetch branches on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      if (!user?.gymId) {
        message.error('Gym ID not found. Please login again.');
        return;
      }

      setBranchesLoading(true);
      try {
        let branchesData: Branch[] = [];

        if (user.role === 'gym_owner') {
          // Gym owner can see all branches in their gym
          const response = await api.branches.getByGym(user.gymId);
          branchesData = response?.branches || [];
          console.log('Branches response:', response);
        } else if (user.role === 'manager') {
          // Manager can only see their own branch
          if (user.branchId) {
            try {
              // Fetch the manager's branch details
              const branchResponse = await api.branches.getById(user.branchId);
              const branchDetails = branchResponse.data;
              branchesData = [{
                _id: branchDetails._id || user.branchId,
                name: branchDetails.name || 'My Branch',
                status: branchDetails.status || 'active'
              }];
            } catch (error) {
              // Fallback if branch details fetch fails
              branchesData = [{
                _id: user.branchId,
                name: 'My Branch',
                status: 'active'
              }];
            }
          }
        } else {
          // For other roles, show all branches in the gym
          const response = await api.branches.getByGym(user.gymId);
          branchesData = response?.branches || [];
          console.log('Branches response (other roles):', response);
        }

        console.log('Final branches data:', branchesData);
        setBranches(branchesData);
        
        // For managers, automatically set their branch as the default value
        if (user?.role === 'manager' && branchesData.length > 0) {
          form.setFieldsValue({
            branchId: branchesData[0]._id
          });
        }
      } catch (error: any) {
        console.error('Error fetching branches:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          response: error.response
        });
        message.error('Failed to fetch branches: ' + (error.message || 'Unknown error'));
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, [user?.gymId, user?.role, user?.branchId, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    let memberId = null;
    
    try {
      // Step 1: Create member first
      const memberData: MemberFormData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
        branchId: values.branchId,
        profile: {
          phone: values.phoneNumber,
          gender: values.personalGender,
        },
      };

      // If there's an uploaded file, add it to the form data
      if (fileList.length > 0 && fileList[0].originFileObj) {
        memberData.image = fileList[0].originFileObj;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('firstName', memberData.firstName);
      formData.append('lastName', memberData.lastName);
      formData.append('email', memberData.email);
      formData.append('role', memberData.role);
      formData.append('branchId', memberData.branchId);
      
      if (memberData.image) {
        formData.append('image', memberData.image);
      }

      console.log('Creating member with data:', memberData);

      // Create member directly using API
      const memberResponse = await api.members.create(formData);
      console.log('Member creation response:', memberResponse);
      
      // Try different possible ID fields - the member ID is in response.member
      memberId = memberResponse.member?.id || memberResponse.member?._id || memberResponse.member?.memberId || 
                 memberResponse.id || memberResponse._id || memberResponse.memberId || 
                 memberResponse.data?.id || memberResponse.data?.memberId;
      
      console.log('Member created successfully with ID:', memberId);
      
      if (!memberId) {
        console.error('Available response fields:', Object.keys(memberResponse));
        console.error('Response structure:', {
          message: memberResponse.message,
          member: memberResponse.member,
          faceRecognition: memberResponse.faceRecognition
        });
        throw new Error('Failed to get member ID from response. Available fields: ' + Object.keys(memberResponse).join(', '));
      }

      // Step 2: Create personal details using the memberId
      const personalDetailsData = {
        memberId: memberId,
        gender: values.personalGender,
        streetAddress: values.streetAddress || '',
        city: values.city || '',
        zipcode: values.zipcode || '',
        state: values.state || '',
        country: values.country || '',
        phoneNumber: values.phoneNumber,
        emergencyContacts: values.emergencyContacts || [],
        dateOfBirth: values.dateOfBirth ? (values.dateOfBirth instanceof Date ? values.dateOfBirth.toISOString().split('T')[0] : new Date(values.dateOfBirth).toISOString().split('T')[0]) : '',
        membership: values.membership,
        paidAmount: values.paidAmount ? values.paidAmount.toString() : '0',
      };

      console.log('Creating personal details with data:', personalDetailsData);
      console.log('API endpoint:', '/members-personal-details');
      console.log('Request method: POST');

      // Create personal details - this is mandatory
      try {
        const personalDetailsResponse = await api.membersPersonalDetails.create(personalDetailsData);
        console.log('Personal details created successfully:', personalDetailsResponse);
      } catch (personalError: any) {
        console.error('Personal details API error:', personalError);
        console.error('Error details:', {
          message: personalError.message,
          status: personalError.status,
          response: personalError.response
        });
        throw new Error(`Personal details creation failed: ${personalError.message}`);
      }
      
      // Check if face recognition failed but member was still created
      const faceRecognitionFailed = memberResponse.faceRecognition === false || 
                                   (memberResponse.faceRecognition && memberResponse.faceRecognition.status === 'failure');
      
      if (faceRecognitionFailed) {
        message.success('Member and personal details created successfully! Note: Face recognition failed - you can add a face photo later.');
      } else {
        message.success('Member and personal details created successfully!');
      }
      form.resetFields();
      setFileList([]);
      // Clear all form fields including personal details
      form.setFieldsValue({
        firstName: '',
        lastName: '',
        email: '',
        role: 'trainer',
        branchId: '',
        phoneNumber: '',
        personalGender: '',
        dateOfBirth: null,
        streetAddress: '',
        city: '',
        state: '',
        zipcode: '',
        country: '',
        membership: '',
        paidAmount: 0,
        emergencyContacts: []
      });
      router.push('/members');
    } catch (error: any) {
      console.error('Error in member creation process:', error);
      
      // If member was created but personal details failed, try to clean up
      if (memberId) {
        console.log('Member was created but personal details failed. Member ID:', memberId);
        message.warning('Member created but personal details failed. Please edit the member to add personal details.');
      } else {
        message.error(error.message || 'Failed to create member');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const uploadProps = {
    name: 'image',
    multiple: false,
    fileList,
    beforeUpload: () => false, // Prevent auto upload
    onChange: handleUploadChange,
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title="Add New Member">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            role: 'trainer',
            gender: 'male',
          }}
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
                  { type: 'email', message: 'Please enter a valid email' }
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
            help={user?.role === 'manager' ? 'You can only add members to your assigned branch' : undefined}
          >
            <Select 
              placeholder={user?.role === 'manager' ? 'Your branch' : 'Select branch'} 
              loading={branchesLoading}
              disabled={branchesLoading || user?.role === 'manager'}
            >
              {branches.map((branch) => (
                <Option key={branch._id} value={branch._id}>
                  {branch.name}
                </Option>
              ))}
            </Select>
          </Form.Item>


          <Form.Item label="Profile Image">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Upload Image</Button>
            </Upload>
          </Form.Item>

          <Divider>Personal Details</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Phone Number"
                name="phoneNumber"
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter phone number"
                />
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

          <Form.Item
            label="Date of Birth"
            name="dateOfBirth"
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Select date of birth"
            />
          </Form.Item>

          <Form.Item
            label="Street Address"
            name="streetAddress"
          >
            <Input
              prefix={<HomeOutlined />}
              placeholder="Enter street address"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="City"
                name="city"
              >
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="State"
                name="state"
              >
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Zipcode"
                name="zipcode"
              >
                <Input placeholder="Enter zipcode" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Country"
            name="country"
          >
            <Input placeholder="Enter country" />
          </Form.Item>

          <Form.Item
            label="Membership Type"
            name="membership"
            rules={[{ required: true, message: 'Please select membership type' }]}
          >
            <Select 
              placeholder="Select membership type"
              loading={membershipTypesLoading}
            >
              {membershipTypes.map((membership) => (
                <Option key={membership.id || membership._id} value={membership.type}>
                  {membership.type} - ₹{membership.price} ({membership.duration} days)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Paid Amount"
            name="paidAmount"
            initialValue={0}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter paid amount"
              min={0}
              formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.List name="emergencyContacts">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <label style={{ fontWeight: 500 }}>Emergency Contacts</label>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    size="small"
                  >
                    Add Contact
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true, message: 'Missing contact name' }]}
                        >
                          <Input placeholder="Contact name" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'phone']}
                          rules={[{ required: true, message: 'Missing phone number' }]}
                        >
                          <Input placeholder="Phone number" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
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
                  </Card>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Create Member
            </Button>
            <Button 
              style={{ marginLeft: 8 }} 
              onClick={() => router.push('/members')}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}