'use client';

import { Card, Col, Row, Statistic } from 'antd';
import {
  BankOutlined,
  DollarCircleOutlined,
  TeamOutlined,
  TransactionOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { CSSProperties } from 'react';
import { KpiSummary } from '../types';

interface KpiCardsProps {
  kpis: KpiSummary;
  showBranchStats: boolean;
}

const cardStyle: CSSProperties = {
  borderRadius: 14,
  background: '#FFFFFF',
  border: '1px solid #f0f0f0',
  transition: 'transform 180ms ease, box-shadow 180ms ease',
};

const valueStyle = { color: '#1f1f1f' };

export default function KpiCards({ kpis, showBranchStats }: KpiCardsProps) {
  const items = [
    {
      key: 'revenue',
      title: 'Revenue This Month',
      value: kpis.revenueThisMonth,
      prefix: <DollarCircleOutlined style={{ color: '#22C55E' }} />,
    },
    {
      key: 'pending',
      title: 'Pending Amount',
      value: kpis.pendingAmount,
      prefix: <WalletOutlined style={{ color: '#F59E0B' }} />,
    },
    {
      key: 'overdue',
      title: 'Overdue Amount',
      value: kpis.overdueAmount,
      prefix: <BankOutlined style={{ color: '#EF4444' }} />,
    },
    {
      key: 'members',
      title: 'Total Members',
      value: kpis.totalMembers,
      prefix: <TeamOutlined style={{ color: '#FFFFFF' }} />,
    },
    {
      key: 'payments',
      title: 'Total Payments',
      value: kpis.totalPayments,
      prefix: <TransactionOutlined style={{ color: '#FFFFFF' }} />,
    },
  ];

  if (showBranchStats) {
    items.push({
      key: 'branches',
      title: 'Total Branches',
      value: kpis.totalBranches || 0,
      prefix: <BankOutlined style={{ color: '#FFFFFF' }} />,
    });
  }

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.key} xs={24} sm={12} lg={8}>
          <Card style={cardStyle} styles={{ body: { padding: 16 } }}>
            <Statistic
              title={<span style={{ color: '#666666' }}>{item.title}</span>}
              value={item.value}
              precision={item.key.includes('amount') || item.key === 'revenue' || item.key === 'pending' ? 2 : 0}
              prefix={item.prefix}
              valueStyle={valueStyle}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
