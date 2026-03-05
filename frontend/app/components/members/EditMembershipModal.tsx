'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, App, Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';

interface EditMembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  membership: any;
}

type StatusValue = 'active' | 'inactive';

const EditMembershipModal: React.FC<EditMembershipModalProps> = ({
  visible,
  onClose,
  membership,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && membership) {
      const originalMembership = membership.originalData || membership;
      const isActive = originalMembership?.isActive ?? membership?.isActive ?? true;
      form.setFieldsValue({
        status: isActive ? 'active' : 'inactive',
      });
    }
  }, [visible, membership, form]);

  const handleSubmit = async (values: { status: StatusValue }) => {
    if (!membership?.id) return;
    setLoading(true);
    try {
      const originalMembership = membership.originalData || membership;
      const payload = {
        type: originalMembership?.type ?? membership?.type,
        price: originalMembership?.price ?? membership?.price ?? 0,
        description: originalMembership?.description ?? membership?.description ?? '',
        duration: originalMembership?.duration ?? membership?.duration ?? 0,
        isActive: values.status === 'active',
      };
      await api.membershipPrices.update(membership.id, payload);
      message.success('Membership status updated successfully');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      message.error(error?.message || 'Failed to update membership');
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
          <span>Edit Membership Status</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={440}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'active' }}>
        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select
            placeholder="Select status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Update Status
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
