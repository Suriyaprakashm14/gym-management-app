'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  App,
  Upload,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  UploadOutlined,
  HomeOutlined,
  ContactsOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { useAppDispatch } from '../../redux/hooks';
import { updateMember } from '../../redux/membersSlice';
import { api } from '../../utils/api';

const { Option } = Select;
const { Title, Text } = Typography;

interface EditMemberModalProps {
  visible: boolean;
  onClose: () => void;
  member: any;
}

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  role: string;
  branchId: string;
  status: string;
  // Personal Details
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  zipcode: string;
  state: string;
  country: string;
  phoneNumber: string;
  // Emergency Contacts
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relation: string;
  }>;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  visible,
  onClose,
  member,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [personalDetails, setPersonalDetails] = useState<any>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (visible && member?.id) {
      loadMemberData();
      fetchPersonalDetails().catch(() => {});
    }
  }, [visible, member?.id, form]);

  const fetchPersonalDetails = async () => {
    if (!member?.id) return;
    let personalData: any = null;
    try {
      personalData = await api.membersPersonalDetails.getByMemberId(member.id);
    } catch (error: any) {
      const isNotFound =
        error?.message?.includes('Personal details not found') ||
        error?.message?.includes('404') ||
        String(error?.message || '').toLowerCase().includes('not found');
      if (!isNotFound) {
        message.warning('Could not load personal details. You can still edit basic info.');
      }
    }
    setPersonalDetails(personalData);
    form.setFieldsValue({
      dateOfBirth: personalData?.dateOfBirth
        ? new Date(personalData.dateOfBirth).toISOString().split('T')[0]
        : undefined,
      streetAddress: personalData?.streetAddress ?? '',
      city: personalData?.city ?? '',
      zipcode: personalData?.zipcode ?? '',
      state: personalData?.state ?? '',
      country: personalData?.country ?? '',
      phoneNumber: personalData?.phoneNumber ?? '',
      emergencyContacts: personalData?.emergencyContacts ?? [],
    });
  };

  const loadMemberData = () => {
    if (!member?.id) return;
    form.setFieldsValue({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      phone: member.phone ?? member.profile?.phone ?? '',
      age: member.age ?? member.profile?.age ?? undefined,
      gender: member.gender ?? member.profile?.gender ?? 'male',
      role: member.role ?? 'member',
      status: member.status ?? 'active',
    });

    // Set file list if member has an image
    if (member.image) {
      setFileList([{
        uid: '-1',
        name: 'current-image.jpg',
        status: 'done',
        url: member.image,
      }]);
    } else {
      setFileList([]);
    }
  };

  const handleSubmit = async (values: MemberFormData) => {
    setLoading(true);
    try {
      // Update member basic details (JSON payload; image updates are ignored for now)
      const memberData: any = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        age: values.age,
        gender: values.gender,
        role: values.role,
        status: values.status,
      };

      await dispatch(updateMember({ id: member.id, data: memberData })).unwrap();

      // Update personal details (membership info is not edited here)
      const personalDetailsData: Record<string, unknown> = {
        gender: values.gender,
        streetAddress: values.streetAddress,
        city: values.city,
        zipcode: values.zipcode,
        state: values.state,
        country: values.country,
        phoneNumber: values.phoneNumber,
        dateOfBirth: values.dateOfBirth,
        emergencyContacts: values.emergencyContacts,
      };

      try {
        if (personalDetails != null) {
          await api.membersPersonalDetails.update(member.id, personalDetailsData);
        } else {
          await api.membersPersonalDetails.create({
            memberId: member.id,
            ...personalDetailsData,
            membership: (member as any).membership?.type || 'Monthly',
            totalAmount: 0,
            paidAmount: '0',
          });
        }
      } catch (personalError) {
        console.log('Personal details update failed:', personalError);
        // Don't fail the entire operation if personal details update fails
      }

      message.success('Updated successfully');
      onClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to update member');
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

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>Edit Member Details</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1000}
      destroyOnHidden
      style={{ top: 24 }}
      styles={{
        body: {
          maxHeight: '75vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 0',
        },
        content: {
          overflow: 'hidden',
        },
      }}
    >
      <Card style={{ margin: 0 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            gender: 'male',
            role: 'member',
            status: 'active',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter first name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter last name"
                />
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
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter email address"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Phone"
                name="phone"
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter phone number"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Age"
                name="age"
                rules={[{ required: true, message: 'Please enter age' }]}
              >
                <Input
                  type="number"
                  placeholder="Enter age"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: 'Please select gender' }]}
              >
                <Select placeholder="Select gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="member">Member</Option>
                  <Option value="trainer">Trainer</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Profile Image">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Upload New Image</Button>
            </Upload>
          </Form.Item>

          <Divider>Personal Details</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Date of Birth"
                name="dateOfBirth"
              >
                <Input
                  type="date"
                  prefix={<CalendarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Phone Number"
                name="phoneNumber"
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter phone number"
                />
              </Form.Item>
            </Col>
          </Row>

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

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                Update Member
              </Button>
              <Button onClick={handleCancel} size="large">
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Modal>
  );
};

export default EditMemberModal;
