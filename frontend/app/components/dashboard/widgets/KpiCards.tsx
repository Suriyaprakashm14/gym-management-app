'use client';

import { Col, Row } from 'antd';
import type { CSSProperties } from 'react';
import { KpiSummary } from '../types';

interface KpiCardsProps {
  kpis: KpiSummary;
  showBranchStats: boolean;
}

const totalSum = (kpis: KpiSummary) => {
  const sum = kpis.revenueThisMonth + kpis.pendingAmount + kpis.overdueAmount;
  return sum > 0 ? sum : 1;
};

function CircularPaymentCard({
  label,
  value,
  color,
  percent,
}: {
  label: string;
  value: number;
  color: string;
  percent: number;
}) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (filled / 100) * circumference;

  const cardStyle: CSSProperties = {
    padding: 20,
    textAlign: 'center',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  };

  return (
    <div style={cardStyle}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#fff',
          }}
        >
          ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function KpiCards({ kpis, showBranchStats }: KpiCardsProps) {
  const sum = totalSum(kpis);
  const revenuePercent = (kpis.revenueThisMonth / sum) * 100;
  const pendingPercent = (kpis.pendingAmount / sum) * 100;
  const overduePercent = (kpis.overdueAmount / sum) * 100;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>
        Payments this month
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <CircularPaymentCard
            label="Revenue This Month"
            value={kpis.pendingAmount}
            color="#3B82F6"
            percent={pendingPercent}
          />
        </Col>
        <Col xs={24} sm={8}>
          <CircularPaymentCard
            label="Pending Amount"
            value={kpis.revenueThisMonth}
            color="#22C55E"
            percent={revenuePercent}
          />
        </Col>
        <Col xs={24} sm={8}>
          <CircularPaymentCard
            label="Overdue Amount"
            value={kpis.overdueAmount}
            color="#F59E0B"
            percent={overduePercent}
          />
        </Col>
      </Row>
    </div>
  );
}
