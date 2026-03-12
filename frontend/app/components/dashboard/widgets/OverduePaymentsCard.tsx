'use client';

import { Card, Empty, List, Tag, Typography } from 'antd';
import { formatDisplayDate } from '../../../constants/dateFormat';
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
        overflow: 'hidden',
      }}
      styles={{
        body: {
          height: 300,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        },
      }}
    >
      {items.length === 0 ? (
        <Empty description={<span style={{ color: '#666666' }}>No overdue payments</span>} />
      ) : (
        <List
          dataSource={items.slice(0, 8)}
          style={{ padding: 0 }}
          renderItem={(item) => (
            <List.Item style={{ borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
                  <Text
                    style={{
                      color: '#1f1f1f',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: '1 1 0',
                      minWidth: 0,
                    }}
                    title={item.memberName}
                  >
                    {item.memberName}
                  </Text>
                  <Tag color="error" style={{ flexShrink: 0 }}>INR {item.amount.toLocaleString('en-IN')}</Tag>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                  {item.membership ? <Tag>{item.membership}</Tag> : null}
                  {item.dueDate ? <Tag color="warning">Due {formatDisplayDate(item.dueDate)}</Tag> : null}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
