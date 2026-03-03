'use client';

import { Avatar, Card, Empty, List, Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { CheckInItem } from '../types';

interface TodayCheckInsCardProps {
  items: CheckInItem[];
}

export default function TodayCheckInsCard({ items }: TodayCheckInsCardProps) {
  return (
    <Card
      title={
        <span style={{ color: '#1f1f1f' }}>
          <ClockCircleOutlined /> Today Check-ins
        </span>
      }
      style={{
        borderRadius: 14,
        background: '#FFFFFF',
        border: '1px solid #f0f0f0',
      }}
      styles={{ body: { height: 300 } }}
    >
      {items.length === 0 ? (
        <Empty description={<span style={{ color: '#666666' }}>No check-ins today</span>} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={items}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#f0f2f5', color: '#1f1f1f' }} />
                }
                title={<span style={{ color: '#1f1f1f' }}>{item.memberName}</span>}
                description={
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Tag color="processing">{item.checkInTime}</Tag>
                    {item.branchName ? <Tag>{item.branchName}</Tag> : null}
                    {item.authMethod ? <Tag color="purple">{item.authMethod.replace('_', ' ')}</Tag> : null}
                  </div>
                }
              />
              <CheckCircleOutlined style={{ color: '#22C55E', fontSize: 16 }} />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
