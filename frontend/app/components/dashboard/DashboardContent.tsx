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
  padding: 0,
  position: 'relative',
};

/** Top section: full-width teal bg with Row 1 (Payments + Attendance) inside it; extends down to overlap ~20% of Today check-ins */
const topSectionStyle: React.CSSProperties = {
  width: '100%',
  paddingTop: 24,
  paddingRight: 24,
  paddingBottom: 80,
  paddingLeft: 24,
  background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 35%, #0891b2 70%, #0e7490 100%)',
  position: 'relative',
  zIndex: 0,
};

/** Rest of content; negative margin so teal overlaps top ~20% of Today check-ins */
const contentWrapperStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  paddingTop: 0,
  paddingRight: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  marginTop: -80,
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
        <div style={{ padding: 24 }}>
          <Text type="danger">{error}</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={topSectionStyle}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#fff' }}>
            Dashboard
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Overview of your gym metrics</Text>
        </div>

        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={14}>
            <KpiCards kpis={model.kpis} showBranchStats={roleFlags.isGymOwner || roleFlags.isAdmin} />
          </Col>
          <Col xs={24} lg={10}>
            <AttendanceChartCard data={model.attendanceBars} />
          </Col>
        </Row>
      </div>

      <div style={contentWrapperStyle}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <TodayCheckInsCard items={model.todayCheckIns} />
          </Col>
          <Col xs={24} lg={12}>
            <OverduePaymentsCard items={model.overdueMembers} />
          </Col>
        </Row>
      </div>
    </div>
  );
}
