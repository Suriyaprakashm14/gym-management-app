'use client';

import React from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  createMembershipPriceAsync,
  selectCreateMembershipLoading,
} from '../../redux/membershipsSlice';

const { TextArea } = Input;

interface CreateMembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface MembershipFormData {
  type: string;
  price: number;
  description: string;
  duration: number;
}

const CreateMembershipModal: React.FC<CreateMembershipModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectCreateMembershipLoading);

  const handleSubmit = async (values: MembershipFormData) => {
    try {
      await dispatch(createMembershipPriceAsync(values)).unwrap();
      message.success('Membership created successfully');
      form.resetFields();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to create membership');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          <span>Create New Membership</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{}}
      >
        <Form.Item
          label="Membership Type"
          name="type"
          rules={[{ required: true, message: 'Please select membership type' }]}
        >
          <Input placeholder="e.g., monthly, quarterly, yearly, basic, premium, vip" />
        </Form.Item>

        <Form.Item
          label="Duration (Days)"
          name="duration"
          rules={[{ required: true, message: 'Please enter duration in days' }]}
        >
          <InputNumber
            prefix={<CalendarOutlined />}
            placeholder="Enter duration in days"
            style={{ width: '100%' }}
            min={1}
          />
        </Form.Item>

        <Form.Item
          label="Price (₹)"
          name="price"
          rules={[{ required: true, message: 'Please enter price' }]}
        >
          <InputNumber
            prefix={<span style={{ fontWeight: 600 }}>₹</span>}
            placeholder="Enter price"
            style={{ width: '100%' }}
            min={0}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => (value?.replace(/₹\s?|(,*)/g, '') || '0') as any}
          />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <TextArea
            rows={3}
            placeholder="Enter membership description"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Create Membership
            </Button>
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateMembershipModal;
