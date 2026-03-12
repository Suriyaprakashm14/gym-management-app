"use client";

import React, { useState } from "react";
import { Col, Row, Spin, Typography, Dropdown, Button, DatePicker } from "antd";
import { DownOutlined, CalendarOutlined } from "@ant-design/icons";
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from './hooks/useDashboardData';
import type { DashboardDateFilter } from './hooks/useDashboardData';
import KpiCards from './widgets/KpiCards';
import AttendanceChartCard from './widgets/AttendanceChartCard';
import TodayCheckInsCard from './widgets/TodayCheckInsCard';
import PendingMembersCard from './widgets/PendingMembersCard';
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

const FILTER_LABELS: Record<DashboardDateFilter, string> = {
  currentMonth: "Current Month",
  last3: "Last 3 Months",
  last6: "Last 6 Months",
  last1year: "Last 1 Year",
  custom: "Custom Date Range",
};

export default function DashboardContent() {
  const { user } = useAuth();
  const { model, loading, error, roleFlags, dateFilter, setFilter, customRange } = useDashboardData(user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customRangePicker, setCustomRangePicker] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const handlePreset = (key: Extract<DashboardDateFilter, "currentMonth" | "last3" | "last6" | "last1year">) => {
    setCustomRangePicker(null);
    setFilter(key);
    setDropdownOpen(false);
  };

  const handleCustomRange = (dates: null | (dayjs.Dayjs | null)[]) => {
    const start = dates?.[0];
    const end = dates?.[1];
    if (start && end) {
      setCustomRangePicker([start, end]);
      setFilter("custom", { startDate: start.format("YYYY-MM-DD"), endDate: end.format("YYYY-MM-DD") });
      setDropdownOpen(false);
    }
  };

  const dropdownContent = (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        padding: 12,
        minWidth: 220,
      }}
    >
      <div
        style={{
          marginBottom: 8,
          fontWeight: 600,
          fontSize: 13,
          color: "#1f1f1f",
        }}
      >
        Date range
      </div>
      {(["currentMonth", "last3", "last6", "last1year"] as const).map((key) => (
        <div
          key={key}
          role="button"
          tabIndex={0}
          onClick={() => handlePreset(key)}
          onKeyDown={(e) => e.key === "Enter" && handlePreset(key)}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: 6,
            background: dateFilter === key ? "rgba(14, 116, 144, 0.1)" : "transparent",
            color: dateFilter === key ? "#0e7490" : "#1f1f1f",
            marginBottom: 2,
          }}
        >
          {FILTER_LABELS[key]}
        </div>
      ))}
      <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 8, paddingTop: 12 }}>
        <div style={{ marginBottom: 8, fontSize: 13, color: "#595959" }}>Custom date range</div>
        <RangePicker
          value={customRangePicker ?? (customRange ? [dayjs(customRange.startDate), dayjs(customRange.endDate)] : null)}
          onChange={(dates) => handleCustomRange(dates)}
          allowClear={false}
          style={{ width: "100%" }}
          format="DD-MM-YYYY"
          placement="bottomLeft"
          classNames={{ popup: { root: 'dashboard-range-picker-dropdown' } }}
          styles={{ popup: { root: { zIndex: 2147483647 } } }}
        />
      </div>
    </div>
  );

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
        <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#fff' }}>
              Dashboard
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Overview of your gym metrics</Text>
          </div>
          <Dropdown
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            popupRender={() => dropdownContent}
            trigger={['click']}
            overlayStyle={{ zIndex: 2147483646 }}
          >
            <Button
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff',
                minWidth: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <CalendarOutlined style={{ marginRight: 8 }} />
                {dateFilter === "custom" && customRange
                  ? `${dayjs(customRange.startDate).format("DD-MM-YYYY")} – ${dayjs(customRange.endDate).format("DD-MM-YYYY")}`
                  : FILTER_LABELS[dateFilter]}
              </span>
              <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
            </Button>
          </Dropdown>
        </div>

        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={14}>
            <KpiCards kpis={model.kpis} showBranchStats={roleFlags.isGymOwner} />
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
            <PendingMembersCard items={model.pendingMembers} />
          </Col>
        </Row>
      </div>
    </div>
  );
}
