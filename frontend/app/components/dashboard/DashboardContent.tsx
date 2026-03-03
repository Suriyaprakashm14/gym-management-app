'use client';

import React from 'react';
import { Col, Row, Spin, Typography } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from './hooks/useDashboardData';
import KpiCards from './widgets/KpiCards';
import AttendanceChartCard from './widgets/AttendanceChartCard';
import TodayCheckInsCard from './widgets/TodayCheckInsCard';
import OverduePaymentsCard from './widgets/OverduePaymentsCard';

const { Title, Text } = Typography;

const panelStyle: React.CSSProperties = {
  background: '#F2F5F9',
  minHeight: '100%',
  padding: 24,
};

export default function DashboardContent() {
  const { user } = useAuth();
  const { model, loading, error, roleFlags } = useDashboardData(user);

  if (loading && model.kpis.totalMembers === 0 && model.attendanceBars.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={panelStyle}>
        <Text type="danger">{error}</Text>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Dashboard
        </Title>
        <Text type="secondary">Overview of your gym metrics</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <KpiCards kpis={model.kpis} showBranchStats={roleFlags.isGymOwner || roleFlags.isAdmin} />
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <AttendanceChartCard data={model.attendanceBars} />
        </Col>
        <Col xs={24} lg={12}>
          <TodayCheckInsCard items={model.todayCheckIns} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <OverduePaymentsCard items={model.overdueMembers} />
        </Col>
      </Row>
    </div>
  );
}
