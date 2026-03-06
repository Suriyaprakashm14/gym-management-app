'use client';

import React, { useState, useEffect } from 'react';
import {
  App,
  Table,
  Button,
  Card,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Popconfirm,
  Space,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../utils/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ExpenseRecord {
  _id: string;
  key: string;
  amount: number;
  date: string;
  category?: string | null;
  description?: string | null;
  branchId?: string | null;
}

export default function ExpensesContent() {
  const { message } = App.useApp();
  const [list, setList] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchList = async () => {
    try {
      setLoading(true);
      const response = await api.expenses.list({});
      const data = Array.isArray(response) ? response : (response as any)?.data ?? [];
      setList(
        (data as any[]).map((e: any) => ({
          key: e._id,
          _id: e._id,
          amount: e.amount ?? 0,
          date: e.date,
          category: e.category ?? null,
          description: e.description ?? null,
          branchId: e.branchId ?? null,
        }))
      );
    } catch (err) {
      message.error('Failed to load expenses');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: ExpenseRecord) => {
    setEditingId(record._id);
    form.setFieldsValue({
      amount: record.amount,
      date: record.date ? dayjs(record.date) : dayjs(),
      category: record.category ?? undefined,
      description: record.description ?? undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        amount: values.amount,
        date: values.date ? values.date.toISOString?.() ?? values.date : new Date().toISOString(),
        category: values.category || undefined,
        description: values.description || undefined,
      };
      if (editingId) {
        await api.expenses.update(editingId, payload);
        message.success('Expense updated');
      } else {
        await api.expenses.create(payload);
        message.success('Expense added');
      }
      setModalOpen(false);
      fetchList();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err?.message ?? 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.expenses.delete(id);
      message.success('Expense deleted');
      fetchList();
    } catch (err) {
      message.error('Failed to delete expense');
    }
  };

  const columns: ColumnsType<ExpenseRecord> = [
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (v: string) => (v ? dayjs(v).format('DD MMM YYYY') : '—') },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 140, render: (v: string) => v || '—' },
    { title: 'Notes / Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '—' },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this expense?" onConfirm={() => handleDelete(record._id)} okText="Yes" cancelText="No">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: 4 }}>Expenses</Title>
          <Text type="secondary">Track and manage gym expenses</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Expense
        </Button>
      </div>
      <Card>
        <Table
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={list.length > 0 ? { pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} expenses` } : false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No expenses found"
                style={{ padding: '32px 0' }}
              >
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Add an expense using the button above.
                </Text>
              </Empty>
            ),
          }}
        />
      </Card>
      <Modal
        title={editingId ? 'Edit Expense' : 'Add Expense'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editingId ? 'Update' : 'Add'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Enter amount' }]}>
            <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="₹" placeholder="Amount" />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select date' }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="Category (optional)">
            <Input placeholder="e.g. Rent, Utilities" />
          </Form.Item>
          <Form.Item name="description" label="Notes / Description (optional)">
            <Input.TextArea rows={3} placeholder="Description or notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
