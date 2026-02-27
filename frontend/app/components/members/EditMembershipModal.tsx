'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  message,
} from 'antd';
import {
  EditOutlined,
  DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { api } from '../../utils/api';

const { TextArea } = Input;

interface EditMembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  membership: any;
}

interface MembershipFormData {
  type: string;
  price: number;
  description: string;
  duration: number;
}

const EditMembershipModal: React.FC<EditMembershipModalProps> = ({
  visible,
  onClose,
  membership,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && membership) {
      // Get the original membership data from the items array
      const originalMembership = membership.originalData || membership;
      
      form.setFieldsValue({
        type: originalMembership.type || membership.type || '',
        price: originalMembership.price || membership.price || 0,
        description: originalMembership.description || membership.description || '',
        duration: originalMembership.duration || membership.duration || 0,
      });
    }
  }, [visible, membership, form]);

  const handleSubmit = async (values: MembershipFormData) => {
    setLoading(true);
    try {
      await api.membershipPrices.update(membership.id, values);
      message.success('Membership updated successfully');
      form.resetFields();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to update membership');
    } finally {
      setLoading(false);
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
          <EditOutlined />
          <span>Edit Membership</span>
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
            prefix={<DollarOutlined />}
            placeholder="Enter price"
            style={{ width: '100%' }}
            min={0}
            formatter={(value?: number) => `₹ ${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value?: string) => {
              if (!value) return 0;
              const parsed = Number(value.replace(/₹\s?|(,*)/g, ''));
              return Number.isFinite(parsed) ? parsed : 0;
            }}
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
              Update Membership
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

export default EditMembershipModal;
