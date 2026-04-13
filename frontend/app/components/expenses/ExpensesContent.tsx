'use client';

import React, { useState, useEffect } from 'react';
import {
  App,
  Table,
  Button,
  Card,
  Typography,
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Popconfirm,
  Space,
  Empty,
  Tabs,
  Row,
  Col,
  Flex,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageLoader from '../PageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useBranchContext } from '../../contexts/BranchContext';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  createExpenseAsync,
  createExpenseCategoryAsync,
  deleteExpenseAsync,
  deleteExpenseCategoryAsync,
  fetchExpenseCategoriesAsync,
  fetchExpensesAsync,
  selectExpenseCategories,
  selectExpenseCategoriesLoading,
  selectExpenseCategorySaving,
  selectExpenses,
  selectExpensesLoading,
  selectExpenseSaving,
  updateExpenseAsync,
} from '../../redux/expensesSlice';
import {
  fetchBranchesAsync,
  selectBranches,
} from '../../redux/branchesSlice';

const { Title, Text } = Typography;

interface ExpenseRecord {
  _id: string;
  key: string;
  amount: number;
  date: string;
  category?: string | null;
  description?: string | null;
  branchId?: string | null;
  branchName?: string | null;
}

interface ExpenseCategoryItem {
  _id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

interface BranchItem {
  _id: string;
  name: string;
}

const ADD_CATEGORY_OPTION_VALUE = '__add_category__';

export default function ExpensesContent() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { selectedBranch } = useBranchContext();
  const isOwner = user?.role === 'gym_owner';
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const dispatch = useAppDispatch();
  const list = useAppSelector(selectExpenses) as ExpenseRecord[];
  const categories = useAppSelector(selectExpenseCategories) as ExpenseCategoryItem[];
  const categoriesLoading = useAppSelector(selectExpenseCategoriesLoading);
  const loading = useAppSelector(selectExpensesLoading);
  const expenseSaving = useAppSelector(selectExpenseSaving);
  const categorySaving = useAppSelector(selectExpenseCategorySaving);
  const branches = useAppSelector(selectBranches) as BranchItem[];
  const branchIdToName = React.useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach((b) => { map[b._id] = b.name; });
    if (user?.branchName && user?.branchId) map[user.branchId] = user.branchName;
    return map;
  }, [branches, user?.branchId, user?.branchName]);

  useEffect(() => {
    dispatch(fetchExpensesAsync(isOwner && selectedBranch ? { branchId: selectedBranch } : undefined));
  }, [dispatch, isOwner, selectedBranch]);

  useEffect(() => {
    dispatch(fetchExpenseCategoriesAsync());
  }, [dispatch]);

  useEffect(() => {
    if (isOwner && user?.gymId) {
      dispatch(fetchBranchesAsync(user.gymId));
    }
  }, [dispatch, isOwner, user?.gymId]);

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
      const categoryFinal = values.category ? String(values.category).trim() : undefined;
      const payload: { amount: number; date: string; category?: string; description?: string; branchId?: string } = {
        amount: values.amount,
        date: values.date ? values.date.toISOString?.() ?? values.date : new Date().toISOString(),
        category: categoryFinal,
        description: values.description || undefined,
      };
      if (!editingId && isOwner && values.branchId) {
        payload.branchId = values.branchId;
      }
      if (editingId) {
        await dispatch(updateExpenseAsync({ id: editingId, data: payload })).unwrap();
        message.success('Expense updated');
      } else {
        await dispatch(createExpenseAsync(payload)).unwrap();
        message.success('Expense added');
      }
      setModalOpen(false);
      dispatch(fetchExpensesAsync(isOwner && selectedBranch ? { branchId: selectedBranch } : undefined));
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err?.message ?? 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteExpenseAsync(id)).unwrap();
      message.success('Expense deleted');
      dispatch(fetchExpensesAsync(isOwner && selectedBranch ? { branchId: selectedBranch } : undefined));
    } catch (err) {
      message.error('Failed to delete expense');
    }
  };

  const categoryOptions = [
    ...categories.map((c) => ({ label: c.name, value: c.name })),
    { label: 'Add category', value: ADD_CATEGORY_OPTION_VALUE },
  ];

  const expenseColumns: ColumnsType<ExpenseRecord> = [
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => `₹ ${Number(v).toLocaleString('en-IN')}` },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (v: string) => (v ? dayjs(v).format('DD-MM-YYYY') : '—') },
    ...(isOwner
      ? [{ title: 'Branch', key: 'branch', width: 140, render: (_: unknown, r: ExpenseRecord) => branchIdToName[r.branchId as string] || r.branchName || r.branchId || '—' }]
      : []),
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

  const handleCategoryDrawerClose = () => {
    categoryForm.resetFields();
    setCategoryDrawerOpen(false);
  };

  const handleAddCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      const createdCategory = await dispatch(createExpenseCategoryAsync({
        name: String(values.name || '').trim(),
        description: String(values.description || '').trim() || undefined,
      })).unwrap();
      message.success('Category added');
      form.setFieldValue('category', createdCategory.name);
      handleCategoryDrawerClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message ?? 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await dispatch(deleteExpenseCategoryAsync(id)).unwrap();
      message.success('Category removed');
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to delete category');
    }
  };

  const categoryColumns: ColumnsType<ExpenseCategoryItem> = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => value || '—',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: string | null | undefined) => value || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ExpenseCategoryItem) => (
        <Popconfirm title="Delete this category?" onConfirm={() => handleDeleteCategory(record._id)} okText="Yes" cancelText="No">
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  if (loading && list.length === 0) {
    return <PageLoader message="Loading expenses…" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Expenses</Title>
        </Col>
        <Col>
          <Flex align="center" gap={8}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={activeTab === 'expenses' ? handleAdd : () => setCategoryDrawerOpen(true)}
            >
              {activeTab === 'expenses' ? 'Add expense' : 'Add category'}
            </Button>
          </Flex>
        </Col>
      </Row>
      <Card variant="borderless" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'expenses' | 'categories')}
          items={[
            {
              key: 'expenses',
              label: 'Expenses',
              children: (
                <Table
                  rowKey="_id"
                  columns={expenseColumns}
                  dataSource={list}
                  loading={loading && list.length > 0}
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
              ),
            },
            {
              key: 'categories',
              label: 'Categories',
              children: (
                <Table
                  rowKey="_id"
                  columns={categoryColumns}
                  dataSource={categories}
                  loading={categoriesLoading}
                  pagination={categories.length > 0 ? { pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} categories` } : false}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No categories found"
                        style={{ padding: '32px 0' }}
                      >
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                          Add a category using the button above.
                        </Text>
                      </Empty>
                    ),
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
      <Drawer
        title={editingId ? 'Edit expense' : 'Add expense'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        destroyOnHidden={false}
        width={480}
        extra={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" loading={expenseSaving} onClick={() => form.submit()}>
              {editingId ? 'Update' : 'Add'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {isOwner && !editingId && (
            <Form.Item name="branchId" label="Branch (optional)">
              <Select
                allowClear
                placeholder="All branches (no branch)"
                options={branches.map((b) => ({ label: b.name, value: b._id }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Enter amount' }]}>
            <InputNumber
              min={0}
              step={1}
              style={{ width: '100%' }}
              prefix={<span style={{ fontWeight: 600 }}>₹</span>}
              placeholder="Enter amount"
              formatter={(value) => (value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select date' }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY"/>
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Select
              allowClear
              placeholder={categories.length === 0 && !categoriesLoading ? 'No categories available' : 'Select category'}
              options={categoryOptions}
              showSearch
              optionFilterProp="label"
              loading={categoriesLoading}
              notFoundContent={categories.length === 0 && !categoriesLoading ? 'No categories available. Add one from the Categories tab.' : null}
              onChange={(value) => {
                if (value === ADD_CATEGORY_OPTION_VALUE) {
                  setTimeout(() => {
                    form.setFieldValue('category', undefined);
                    setCategoryDrawerOpen(true);
                  }, 0);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="description" label="Notes (optional)">
            <Input.TextArea rows={2} placeholder="Short note" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="Add category"
        open={categoryDrawerOpen}
        onClose={handleCategoryDrawerClose}
        width={420}
        destroyOnHidden={false}
        extra={
          <Space>
            <Button onClick={handleCategoryDrawerClose}>Cancel</Button>
            <Button type="primary" loading={categorySaving} onClick={handleAddCategory}>
              Save
            </Button>
          </Space>
        }
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="name"
            label="Category name"
            rules={[{ required: true, message: 'Enter category name' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} placeholder="Enter category description" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
