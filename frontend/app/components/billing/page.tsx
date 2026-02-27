'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Spin, Card, Typography, Space, Tag } from 'antd';
import { PlusOutlined, DollarOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import DashboardLayout from '../dashboard/DashboardLayout';
import ProtectedRoute from '../auth/ProtectedRoute';

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

interface PaymentFormData {
  amount: number;
}

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPendingMembers();
  }, [user]);

  // Filter members based on search text
  const filteredMembers = pendingMembers.filter(member => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      member.memberName.toLowerCase().includes(searchLower) ||
      (member.branchName && member.branchName.toLowerCase().includes(searchLower))
    );
  });

  const fetchPendingMembers = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        message.error('User not authenticated');
        return;
      }

      let response;
      if (user.role === 'gym_owner') {
        // For gym owners, use the overdue analytics API
        response = await api.request('/payments/analytics/overdue/gym-owner');
        
        // Extract pending members from the response
        const pendingMembersList: PendingMember[] = [];
        if (response.branches && Array.isArray(response.branches)) {
          response.branches.forEach((branch: any) => {
            if (branch.overdueMembersList && Array.isArray(branch.overdueMembersList)) {
              branch.overdueMembersList.forEach((member: any) => {
                pendingMembersList.push({
                  memberId: member.memberId,
                  memberName: member.memberName,
                  totalAmount: member.totalAmount,
                  paidAmount: member.paidAmount,
                  overdueAmount: member.overdueAmount,
                  membership: member.membership,
                  branchId: branch.branchId || branch._id,
                  branchName: branch.branchName
                });
              });
            }
          });
        }
        setPendingMembers(pendingMembersList);
      } else {
        // For branch managers, use the pending payments API
        response = await api.request('/payments/pending');
        
        // Process response for branch managers - map the response to our interface
        const pendingMembersList: PendingMember[] = [];
        if (response.members && Array.isArray(response.members)) {
          response.members.forEach((member: any) => {
            pendingMembersList.push({
              memberId: member.memberId,
              memberName: member.memberName,
              totalAmount: member.totalAmount,
              paidAmount: member.paidAmount,
              overdueAmount: member.pendingAmount, // Use pendingAmount from API
              membership: member.membership,
              branchId: member.branchId,
              branchName: member.branchName
            });
          });
        }
        setPendingMembers(pendingMembersList);
      }
    } catch (error: any) {
      console.error('Error fetching pending members:', error);
      message.error('Failed to fetch pending members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = (member: PendingMember) => {
    setSelectedMember(member);
    setPaymentModalVisible(true);
    form.setFieldsValue({
      amount: member.overdueAmount
    });
  };

  const handlePaymentSubmit = async (values: PaymentFormData) => {
    if (!selectedMember || !user) return;

    try {
      setPaymentLoading(true);
      
      // Prefer member branch when present, otherwise fallback to current user branch.
      const branchId = selectedMember.branchId || user.branchId;
      if (!branchId) {
        message.error('Unable to determine branch for this payment');
        return;
      }
      
      // Use the correct API format as per sample data
      const paymentData = {
        memberId: selectedMember.memberId,
        paidAmount: values.amount
      };

      await api.payments.createForBranch(branchId, paymentData);

      message.success('Payment added successfully');
      setPaymentModalVisible(false);
      form.resetFields();
      fetchPendingMembers(); // Refresh the list
    } catch (error: any) {
      console.error('Error adding payment:', error);
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
          <div style={{ fontWeight: '600' }}>{text}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            {record.branchName || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Membership',
      dataIndex: 'membership',
      key: 'membership',
      render: (membership: string) => (
        <Tag color="blue">{membership}</Tag>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Paid Amount',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Overdue Amount',
      dataIndex: 'overdueAmount',
      key: 'overdueAmount',
      render: (amount: number) => (
        <span style={{ color: '#F59E0B', fontWeight: '600' }}>
          ₹{amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PendingMember) => (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAddPayment(record)}
          size="small"
        >
          Add Payment
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['gym_owner', 'manager', 'admin']}>
      <DashboardLayout>
        <div style={{ padding: '2rem' }}>
        <Card>
        <div style={{ marginBottom: '1.5rem' }}>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClockCircleOutlined style={{ color: '#F59E0B' }} />
            Pending Payments
          </Title>
          <p style={{ color: '#64748B', margin: '0.5rem 0 1rem 0' }}>
            Manage pending payments and add new payments for members
          </p>
          
          {/* Search Input */}
          <div style={{ marginBottom: '1rem' }}>
            <Input
              placeholder="Search by member name or branch name..."
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: '400px' }}
              allowClear
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredMembers}
          rowKey="memberId"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} ${searchText ? 'filtered' : ''} pending payments`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <DollarOutlined />
            <span>Add Payment</span>
          </Space>
        }
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        {selectedMember && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              {selectedMember.memberName}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
              Overdue Amount: <span style={{ color: '#F59E0B', fontWeight: '600' }}>
                ₹{selectedMember.overdueAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handlePaymentSubmit}
        >
          <Form.Item
            label="Payment Amount"
            name="amount"
            rules={[
              { required: true, message: 'Please enter payment amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
            ]}
          >
            <InputNumber
              prefix="₹"
              placeholder="Enter payment amount"
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setPaymentModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={paymentLoading}
                icon={<PlusOutlined />}
              >
                Add Payment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default BillingPage;
