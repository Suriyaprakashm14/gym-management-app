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
  message,
  Upload,
  Space,
  Typography,
  Divider,
  InputNumber,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  UploadOutlined,
  HomeOutlined,
  ContactsOutlined,
  DollarOutlined,
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
  // Membership Details
  membership: string;
  totalAmount: number;
  paidAmount: number;
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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [personalDetails, setPersonalDetails] = useState<any>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (visible && member) {
      fetchPersonalDetails();
      loadMemberData();
    }
  }, [visible, member, form]);

  const fetchPersonalDetails = async () => {
    if (!member?.id) return;
    
    try {
      const response = await api.membersPersonalDetails.getByMemberId(member.id);
      const personalData = response;
      setPersonalDetails(personalData);
      
      // Pre-fill form with personal details
      form.setFieldsValue({
        dateOfBirth: personalData.dateOfBirth ? new Date(personalData.dateOfBirth).toISOString().split('T')[0] : '',
        streetAddress: personalData.streetAddress || '',
        city: personalData.city || '',
        zipcode: personalData.zipcode || '',
        state: personalData.state || '',
        country: personalData.country || '',
        phoneNumber: personalData.phoneNumber || '',
        membership: personalData.membership || '',
        totalAmount: personalData.totalAmount || 0,
        paidAmount: personalData.paidAmount || 0,
        emergencyContacts: personalData.emergencyContacts || [],
      });
    } catch (error) {
      console.log('No personal details found for this member');
      setPersonalDetails(null);
    }
  };

  const loadMemberData = () => {
    // Pre-fill form with member data
    form.setFieldsValue({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      age: member.age || '',
      gender: member.gender || 'male',
      role: member.role || 'member',
      status: member.status || 'active',
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
      // Update member basic details
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

      // If there's an uploaded file, add it to the form data
      if (fileList.length > 0 && fileList[0].originFileObj) {
        memberData.image = fileList[0].originFileObj;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('firstName', memberData.firstName);
      formData.append('lastName', memberData.lastName);
      formData.append('email', memberData.email);
      formData.append('phone', memberData.phone);
      formData.append('age', memberData.age.toString());
      formData.append('gender', memberData.gender);
      formData.append('role', memberData.role);
      formData.append('status', memberData.status);

      if (memberData.image) {
        formData.append('image', memberData.image);
      }

      // Update member basic details
      await dispatch(updateMember({ id: member.id, data: formData })).unwrap();

      // Update personal details
      const personalDetailsData = {
        gender: values.gender,
        streetAddress: values.streetAddress,
        city: values.city,
        zipcode: values.zipcode,
        state: values.state,
        country: values.country,
        phoneNumber: values.phoneNumber,
        dateOfBirth: values.dateOfBirth,
        membership: values.membership,
        totalAmount: values.totalAmount,
        paidAmount: values.paidAmount,
        emergencyContacts: values.emergencyContacts,
      };

      try {
        await api.membersPersonalDetails.update(member.id, personalDetailsData);
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
    >
      <Card>
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

          <Divider>Membership Information</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Membership Type"
                name="membership"
                rules={[{ required: true, message: 'Please select membership type' }]}
              >
                <Select placeholder="Select membership type">
                  <Option value="monthly">Monthly</Option>
                  <Option value="quarterly">Quarterly</Option>
                  <Option value="yearly">Yearly</Option>
                  <Option value="basic">Basic</Option>
                  <Option value="premium">Premium</Option>
                  <Option value="vip">VIP</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Total Amount"
                name="totalAmount"
              >
                <InputNumber
                  prefix={<DollarOutlined />}
                  placeholder="Enter total amount"
                  style={{ width: '100%' }}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Paid Amount"
                name="paidAmount"
              >
                <InputNumber
                  prefix={<DollarOutlined />}
                  placeholder="Enter paid amount"
                  style={{ width: '100%' }}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

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
