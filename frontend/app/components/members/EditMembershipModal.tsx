'use client';

import React, { useEffect } from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Select,
} from 'antd';
import { EditOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  updateMembershipPriceAsync,
  selectUpdateMembershipLoading,
} from '../../redux/membershipsSlice';

const { TextArea } = Input;

interface EditMembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  membership: any;
}

const EditMembershipModal: React.FC<EditMembershipModalProps> = ({
  visible,
  onClose,
  onSuccess,
  membership,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const updateLoading = useAppSelector(selectUpdateMembershipLoading);

  // ── Populate fields when modal opens ─────────────────────────────────────────
  useEffect(() => {
    if (!visible || !membership) return;
    const src = membership.originalData || membership;
    form.setFieldsValue({
      type: src.type ?? '',
      description: src.description ?? '',
      status: (src.isActive ?? true) ? 'active' : 'inactive',
      // read-only display fields
      price: src.price ?? 0,
      duration: src.duration ?? 0,
    });
  }, [visible, membership, form]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (values: {
    type: string;
    description: string;
    status: 'active' | 'inactive';
  }) => {
    const id = membership?.id ?? membership?._id;
    if (!id) return;

    try {
      await dispatch(
        updateMembershipPriceAsync({
          id,
          data: {
            type: values.type.trim(),
            description: values.description.trim(),
            isActive: values.status === 'active',
          },
        })
      ).unwrap();

      message.success('Membership updated successfully');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      message.error(err?.message || err || 'Failed to update membership');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
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
        initialValues={{ status: 'active' }}
      >
        {/* Editable fields */}
        <Form.Item
          label="Membership Type"
          name="type"
          rules={[{ required: true, message: 'Please enter membership type' }]}
        >
          <Input placeholder="e.g., monthly, quarterly, yearly, basic, premium, vip" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <TextArea rows={3} placeholder="Enter membership description" />
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="Select status"
          />
        </Form.Item>

        {/* Read-only display fields (price & duration are immutable after creation) */}
        <Form.Item
          label="Price (₹)"
          name="price"
          tooltip="Price cannot be changed after creation."
        >
          <InputNumber
            disabled
            style={{ width: '100%' }}
            prefix={<span style={{ fontWeight: 600 }}>₹</span>}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => (v?.replace(/₹\s?|(,*)/g, '') || '0') as any}
          />
        </Form.Item>

        <Form.Item
          label="Duration (Days)"
          name="duration"
          tooltip="Duration cannot be changed after creation."
        >
          <InputNumber
            disabled
            style={{ width: '100%' }}
            prefix={<CalendarOutlined />}
            placeholder="Duration in days"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={updateLoading} size="large">
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
