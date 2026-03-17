'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, InputNumber, App, Spin, Card, Typography, Space, Tag } from 'antd';
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useBranchContext } from '../../contexts/BranchContext';
import { api } from '../../utils/api';

const { Title } = Typography;

interface PendingMember {
  memberId: string;
  memberName: string;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  membership: string;
  branchId?: string;
  branchName?: string;
}

export default function BillingContent() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { selectedBranch } = useBranchContext();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchPendingMembers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      if (user.role === 'gym_owner') {
        const url = selectedBranch
          ? `/payments/analytics/overdue/gym-owner?branchId=${encodeURIComponent(selectedBranch)}`
          : '/payments/analytics/overdue/gym-owner';
        const response = await api.request(url);
        const list: PendingMember[] = [];
        if ((response as any)?.branches && Array.isArray((response as any).branches)) {
          (response as any).branches.forEach((branch: any) => {
            if (branch.overdueMembersList && Array.isArray(branch.overdueMembersList)) {
              branch.overdueMembersList.forEach((member: any) => {
                list.push({
                  memberId: member.memberId,
                  memberName: member.memberName,
                  totalAmount: member.totalAmount,
                  paidAmount: member.paidAmount,
                  overdueAmount: member.overdueAmount,
                  membership: member.membership,
                  branchId: branch.branchId || branch._id,
                  branchName: branch.branchName,
                });
              });
            }
          });
        }
        setPendingMembers(list);
      } else {
        const response = await api.request('/payments/analytics/overdue/branch-manager');
        setPendingMembers((response as any)?.members || (response as any)?.overdueMembers || []);
      }
    } catch (err) {
      message.error('Failed to fetch pending members');
      setPendingMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingMembers();
  }, [user, selectedBranch]);

  const handleAddPayment = (member: PendingMember) => {
    setSelectedMember(member);
    setPaymentModalVisible(true);
    form.setFieldsValue({ amount: member.overdueAmount });
  };

  const handlePaymentSubmit = async (values: { amount: number }) => {
    if (!selectedMember) return;

    if (values.amount > selectedMember.overdueAmount) {
      message.error('Payment amount cannot exceed the overdue amount');
      return;
    }
    const branchId = selectedMember.branchId || user?.branchId;
    if (!branchId) {
      message.error('Unable to determine branch for this payment');
      return;
    }
    try {
      setPaymentLoading(true);
      await api.payments.createForBranch(branchId, { memberId: selectedMember.memberId, paidAmount: values.amount });
      message.success('Payment added successfully');
      setPaymentModalVisible(false);
      form.resetFields();
      fetchPendingMembers();
    } catch (err) {
      message.error('Failed to add payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const columns = [
    {
      title: 'Member',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string, record: PendingMember) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{record.branchName || 'N/A'}</div>
        </div>
      ),
    },
    { title: 'Membership', dataIndex: 'membership', key: 'membership', render: (m: string) => <Tag color="blue">{m}</Tag> },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (a: number) => `₹${a.toFixed(2)}` },
    { title: 'Paid Amount', dataIndex: 'paidAmount', key: 'paidAmount', render: (a: number) => `₹${a.toFixed(2)}` },
    {
      title: 'Overdue Amount',
      dataIndex: 'overdueAmount',
      key: 'overdueAmount',
      render: (a: number) => <span style={{ color: '#F59E0B', fontWeight: 600 }}>₹{a.toFixed(2)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: PendingMember) => (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddPayment(record)} size="small">
          Add Payment
        </Button>
      ),
    },
  ];

  if (loading && pendingMembers.length === 0) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: '1.5rem' }}>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClockCircleOutlined style={{ color: '#F59E0B' }} />
            Overdue Payments
          </Title>
          <p style={{ color: '#64748B', margin: '0.5rem 0 0 0' }}>Manage pending payments and add new payments for members</p>
        </div>
        <Table
          columns={columns}
          dataSource={pendingMembers}
          rowKey="memberId"
          pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} pending payments` }}
          sticky
          scroll={{ x: 800, y: 500 }}
        />
      </Card>
      <Modal
        title={<Space><span style={{ fontWeight: 600 }}>₹</span><span>Add Payment</span></Space>}
        open={paymentModalVisible}
        onCancel={() => { setPaymentModalVisible(false); form.resetFields(); }}
        footer={null}
        width={500}
      >
        {selectedMember && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{selectedMember.memberName}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
              Overdue Amount: <span style={{ color: '#F59E0B', fontWeight: 600 }}>₹{selectedMember.overdueAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handlePaymentSubmit}>
          <Form.Item
            label="Payment Amount"
            name="amount"
            rules={[
              { required: true, message: 'Please enter payment amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
              () => ({
                validator(_, value) {
                  if (!value || !selectedMember) return Promise.resolve();
                  if (value > selectedMember.overdueAmount) {
                    return Promise.reject(new Error('Payment amount cannot exceed the overdue amount'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber prefix="₹" placeholder="Enter payment amount" style={{ width: '100%' }} min={0.01} step={0.01} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setPaymentModalVisible(false); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={paymentLoading} icon={<PlusOutlined />}>Add Payment</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
