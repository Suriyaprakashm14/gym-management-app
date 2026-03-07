'use client';

import React, { useState, useEffect } from 'react';
import { App, Button, Input, Typography, Space, Popconfirm } from 'antd';
import { DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { api } from '../../utils/api';

const { Title, Text } = Typography;

interface ExpenseCategoryItem {
  _id: string;
  name: string;
  isActive?: boolean;
}

export default function ManageExpenseCategoriesPage() {
  const { message } = App.useApp();
  const [addName, setAddName] = useState('');
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<ExpenseCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.expenseCategories.list();
      const data = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setList(data as ExpenseCategoryItem[]);
    } catch {
      message.error('Failed to load categories');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await api.expenseCategories.create({ name });
      setList((prev) => [...prev, created as ExpenseCategoryItem]);
      setAddName('');
      message.success('Category added');
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.expenseCategories.delete(id);
      setList((prev) => prev.filter((c) => c._id !== id));
      message.success('Category removed');
    } catch {
      message.error('Failed to delete category');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <Space style={{ marginBottom: 16 }}>
        <Link href="/expenses">
          <Button type="text" icon={<ArrowLeftOutlined />}>Back to Expenses</Button>
        </Link>
      </Space>
      <Title level={3}>Manage expense categories</Title>
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
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading ? (
            <Text type="secondary">Loading…</Text>
          ) : list.length === 0 ? (
            <Text type="secondary">No categories yet. Add one above.</Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {list.map((c) => (
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
    </div>
  );
}
