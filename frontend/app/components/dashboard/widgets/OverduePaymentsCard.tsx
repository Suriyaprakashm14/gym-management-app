'use client';

import { Card, Empty, List, Tag, Typography } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { OverdueItem } from '../types';

const { Text } = Typography;

interface OverduePaymentsCardProps {
  items: OverdueItem[];
}

export default function OverduePaymentsCard({ items }: OverduePaymentsCardProps) {
  return (
    <Card
      title={
        <span style={{ color: '#1f1f1f' }}>
          <AlertOutlined /> Overdue Payments
        </span>
      }
      style={{
        borderRadius: 14,
        background: '#FFFFFF',
        border: 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
      styles={{ body: { height: 300 } }}
    >
      {items.length === 0 ? (
        <Empty description={<span style={{ color: '#666666' }}>No overdue payments</span>} />
      ) : (
        <List
          dataSource={items.slice(0, 8)}
          renderItem={(item) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#1f1f1f', fontWeight: 600 }}>{item.memberName}</Text>
                  <Tag color="error">INR {item.amount.toLocaleString('en-IN')}</Tag>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {item.membership ? <Tag>{item.membership}</Tag> : null}
                  {item.dueDate ? <Tag color="warning">Due {new Date(item.dueDate).toLocaleDateString()}</Tag> : null}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
