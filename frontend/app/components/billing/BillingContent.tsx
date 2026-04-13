'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, InputNumber, App, Card, Typography, Space, Tag, Row, Col, Flex } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useBranchContext } from '../../contexts/BranchContext';
import PageLoader from '../PageLoader';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  createPaymentAsync,
  fetchOverdueMembersAsync,
  selectCreatePaymentLoading,
  selectOverdueMembers,
  selectPaymentsLoading,
} from '../../redux/paymentSlice';

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
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const pendingMembers = useAppSelector(selectOverdueMembers) as PendingMember[];
  const loading = useAppSelector(selectPaymentsLoading);
  const paymentLoading = useAppSelector(selectCreatePaymentLoading);

  useEffect(() => {
    if (!user) {
      return;
    }
    dispatch(
      fetchOverdueMembersAsync({
        role: user.role,
        branchId: user.role === 'gym_owner' ? selectedBranch || undefined : undefined,
      })
    )
      .unwrap()
      .catch(() => {
        message.error('Failed to fetch pending members');
      });
  }, [dispatch, user, selectedBranch, message]);

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
      await dispatch(
        createPaymentAsync({
          branchId,
          memberId: selectedMember.memberId,
          paidAmount: values.amount,
        })
      ).unwrap();
      message.success('Payment added successfully');
      setPaymentModalVisible(false);
      form.resetFields();
      if (user) {
        dispatch(
          fetchOverdueMembersAsync({
            role: user.role,
            branchId: user.role === 'gym_owner' ? selectedBranch || undefined : undefined,
          })
        );
      }
    } catch (err) {
      message.error('Failed to add payment');
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
    return <PageLoader message="Loading billing…" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Overdue Payments</Title>
        </Col>
        <Col />
      </Row>
      <Card>
        <Table
          columns={columns}
          dataSource={pendingMembers}
          rowKey="memberId"
          loading={loading && pendingMembers.length > 0}
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
