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
  Select,
  Popconfirm,
  Space,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../utils/api';
import dayjs from 'dayjs';

const ADD_CATEGORY_VALUE = '__add_category__';

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

interface ExpenseCategoryItem {
  _id: string;
  name: string;
  isActive?: boolean;
}

export default function ExpensesContent() {
  const { message } = App.useApp();
  const [list, setList] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.expenseCategories.list();
      const data = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setCategories((data as ExpenseCategoryItem[]).filter((c) => c.isActive !== false));
    } catch {
      message.error('Failed to load categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

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

  useEffect(() => {
    fetchCategories();
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
      category: record.category ? [record.category] : undefined,
      description: record.description ?? undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const categoryVal = Array.isArray(values.category) ? values.category[0] : values.category;
      const categoryFinal = (categoryVal && categoryVal !== ADD_CATEGORY_VALUE && String(categoryVal).trim()) || undefined;
      const payload = {
        amount: values.amount,
        date: values.date ? values.date.toISOString?.() ?? values.date : new Date().toISOString(),
        category: categoryFinal,
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

  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.name }));
  const categoryOptionsWithAdd =
    categories.length === 0 && !categoriesLoading
      ? [{ label: 'Add a Category', value: ADD_CATEGORY_VALUE }]
      : categoryOptions;

  const columns: ColumnsType<ExpenseRecord> = [
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => `₹ ${Number(v).toLocaleString('en-IN')}` },
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
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: 4 }}>Expenses</Title>
          <Text type="secondary">Track and manage gym expenses by category</Text>
        </div>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setCategoriesModalOpen(true)}>
            Manage categories
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add expense
          </Button>
        </Space>
      </div>
      <Card variant="borderless" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
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
        title={editingId ? 'Edit expense' : 'Add expense'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editingId ? 'Update' : 'Add'}
        destroyOnHidden={false}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Enter amount' }]}>
            <InputNumber
              min={0}
              step={1}
              style={{ width: '100%' }}
              prefix={<span style={{ fontWeight: 600 }}>₹</span>}
              placeholder="0"
              formatter={(value) => (value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select date' }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Select
              allowClear
              placeholder={categories.length === 0 && !categoriesLoading ? 'Add a Category' : 'Select category'}
              options={categoryOptionsWithAdd}
              showSearch
              optionFilterProp="label"
              loading={categoriesLoading}
              notFoundContent={categories.length === 0 && !categoriesLoading ? 'No categories. Use "Manage categories" or add below.' : null}
              onChange={(val) => {
                if (val === ADD_CATEGORY_VALUE) {
                  setCategoriesModalOpen(true);
                  // Defer clear to avoid circular reference (Ant Design Form + Select)
                  setTimeout(() => form.setFieldValue('category', undefined), 0);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="description" label="Notes (optional)">
            <Input.TextArea rows={2} placeholder="Short note" />
          </Form.Item>
        </Form>
      </Modal>

      <ManageCategoriesModal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        onSaved={() => {
          fetchCategories();
          form.setFieldValue('category', undefined);
        }}
        categories={categories}
        setCategories={setCategories}
        message={message}
      />
    </div>
  );
}

interface ManageCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: ExpenseCategoryItem[];
  setCategories: React.Dispatch<React.SetStateAction<ExpenseCategoryItem[]>>;
  message: ReturnType<typeof App.useApp>['message'];
}

function ManageCategoriesModal({ open, onClose, onSaved, categories, setCategories, message }: ManageCategoriesModalProps) {
  const [addName, setAddName] = useState('');
  const [saving, setSaving] = useState(false);
  const [fullList, setFullList] = useState<ExpenseCategoryItem[]>([]);

  const loadFullList = async () => {
    if (!open) return;
    try {
      const res = await api.expenseCategories.list();
      const data = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setFullList(data as ExpenseCategoryItem[]);
    } catch {
      setFullList([]);
    }
  };

  useEffect(() => {
    if (open) loadFullList();
  }, [open]);

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await api.expenseCategories.create({ name });
      setFullList((prev) => [...prev, created as ExpenseCategoryItem]);
      setCategories((prev) => [...prev.filter((c) => c.name !== name), created as ExpenseCategoryItem]);
      setAddName('');
      message.success('Category added');
      onSaved();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.expenseCategories.delete(id);
      setFullList((prev) => prev.filter((c) => c._id !== id));
      setCategories((prev) => prev.filter((c) => c._id !== id));
      message.success('Category removed');
      onSaved();
    } catch (err: any) {
      message.error('Failed to delete category');
    }
  };

  return (
    <Modal
      title="Manage expense categories"
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      destroyOnHidden={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="New category name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onPressEnter={handleAdd}
          />
          <Button type="primary" loading={saving} onClick={handleAdd}>
            Add
          </Button>
        </Space.Compact>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {fullList.length === 0 ? (
            <Text type="secondary">No categories yet. Add one above.</Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fullList.map((c) => (
                <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <Text>{c.name}</Text>
                  <Popconfirm title="Remove this category?" onConfirm={() => handleDelete(c._id)} okText="Yes" cancelText="No">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              ))}
            </Space>
          )}
        </div>
      </Space>
    </Modal>
  );
}
