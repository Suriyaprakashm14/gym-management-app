'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  App,
  Table,
  Tag,
  Space,
  Button,
  Avatar,
  Tooltip,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Spin,
  Alert,
  Modal,
  List,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../utils/api';
import dayjs from 'dayjs';

interface AttendanceData {
  period: string;
  dateRange: { startDate: string; endDate: string };
  summary: {
    totalMembers: number;
    presentCount: number;
    absentCount: number;
    overallAttendanceRate: number;
    totalDaysInPeriod: number;
  };
  presentMembers: Array<{
    memberId: string;
    firstName: string;
    lastName: string;
    branchName: string;
    totalPresent: number;
    totalDays: number;
    attendanceRate: string;
    lastAttendance: string | null;
    attendanceDetails: Array<{ date: string; status: string; time: string; authMethod: string; confidence?: number }>;
  }>;
  absentMembers: Array<{
    memberId: string;
    firstName: string;
    lastName: string;
    branchName: string;
    totalPresent: number;
    totalDays: number;
    attendanceRate: number;
    lastAttendance: null;
    attendanceDetails: any[];
  }>;
  allDates: string[];
}

const { Text, Title } = Typography;

interface AttendanceMember {
  key: string;
  memberId: string;
  firstName: string;
  lastName: string;
  branchName: string;
  totalPresent: number;
  totalDays: number;
  attendanceRate: string;
  lastAttendance: string | null;
  attendanceDetails: Array<{ date: string; status: string; time: string; authMethod: string; confidence?: number }>;
  status: 'present' | 'absent';
}

export default function CheckInPage() {
  const { message } = App.useApp();
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<'all' | 'present' | 'absent'>('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AttendanceMember | null>(null);

  const fetchAttendanceReport = async (showSuccessMessage = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.attendance.getReport({
        period: selectedPeriod,
        ...(selectedPeriod === 'day' && { date: selectedDate.format('YYYY-MM-DD') }),
      });
      setAttendanceData(response);
      if (showSuccessMessage) message.success('Attendance data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance data';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceReport(false);
  }, [selectedPeriod, selectedDate]);

  const getAuthMethodText = (method: string) => {
    switch (method) {
      case 'face_recognition':
        return 'Face Recognition';
      case 'dual_auth':
        return 'Dual Auth';
      case 'fingerprint':
        return 'Fingerprint';
      default:
        return 'Manual';
    }
  };

  const allMembers: AttendanceMember[] = useMemo(() => {
    if (!attendanceData) return [];
    const presentMembers = attendanceData.presentMembers.map((member) => ({
      key: member.memberId,
      ...member,
      status: 'present' as const,
    }));
    const absentMembers = attendanceData.absentMembers.map((member) => ({
      key: member.memberId,
      ...member,
      attendanceRate: String(member.attendanceRate ?? 0),
      status: 'absent' as const,
    }));
    return [...presentMembers, ...absentMembers];
  }, [attendanceData]);

  const filteredMembers = useMemo(() => {
    if (viewMode === 'present') return allMembers.filter((m) => m.status === 'present');
    if (viewMode === 'absent') return allMembers.filter((m) => m.status === 'absent');
    return allMembers;
  }, [allMembers, viewMode]);

  const columns: ColumnsType<AttendanceMember> = [
    {
      title: 'Member',
      dataIndex: 'firstName',
      key: 'name',
      width: 220,
      render: (_: unknown, record: AttendanceMember) => (
        <Space>
          <Avatar size={40} style={{ backgroundColor: record.status === 'present' ? '#52c41a' : '#8c8c8c' }}>
            {record.firstName.charAt(0)}
            {record.lastName.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.firstName} {record.lastName}
            </div>
            <Tag color={record.status === 'present' ? 'success' : 'default'}>{record.status.toUpperCase()}</Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branchName',
      key: 'branch',
      width: 150,
      render: (branchName: string) => (
        <Space size={4}>
          <TeamOutlined style={{ color: '#8c8c8c' }} />
          <Text style={{ fontSize: 13 }}>{branchName}</Text>
        </Space>
      ),
    },
    {
      title: 'Last Check-in',
      dataIndex: 'lastAttendance',
      key: 'lastAttendance',
      width: 150,
      render: (lastAttendance: string | null, record: AttendanceMember) => (
        <Space direction="vertical" size={0}>
          <Text strong>{lastAttendance ? dayjs(lastAttendance).format('h:mm A') : 'Never'}</Text>
          {record.attendanceDetails.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getAuthMethodText(record.attendanceDetails[0].authMethod)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Attendance Rate',
      key: 'attendanceRate',
      width: 200,
      render: (_: unknown, record: AttendanceMember) => (
        <Space direction="vertical" size={4}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 60,
                height: 8,
                backgroundColor: '#f0f0f0',
                borderRadius: 4,
                marginRight: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${record.attendanceRate}%`,
                  height: '100%',
                  backgroundColor: record.status === 'present' ? '#52c41a' : '#ff4d4f',
                }}
              />
            </div>
            <Text strong style={{ fontSize: 13 }}>
              {record.attendanceRate}%
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.totalPresent}/{record.totalDays} days
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: AttendanceMember) => (
        <Tooltip title="View Details">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: '#13c2c2' }} />}
            onClick={() => {
              setSelectedMember(record);
              setDetailsModalOpen(true);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  if (loading && !attendanceData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Error Loading Attendance Data"
          description={error}
          type="error"
          action={
            <Button size="small" danger onClick={() => fetchAttendanceReport(true)}>
              Retry
            </Button>
          }
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
          Check-in Dashboard
        </Title>
        <Text type="secondary">Monitor member attendance and check-in status</Text>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong>Period</Text>
              <Select value={selectedPeriod} onChange={(v) => setSelectedPeriod(v)} style={{ width: 120 }}>
                <Select.Option value="day">Today</Select.Option>
                <Select.Option value="week">This Week</Select.Option>
                <Select.Option value="month">This Month</Select.Option>
              </Select>
            </Space>
          </Col>
          {selectedPeriod === 'day' && (
            <Col>
              <Space direction="vertical" size={4}>
                <Text strong>Date</Text>
                <DatePicker value={selectedDate} onChange={(date) => setSelectedDate(date || dayjs())} style={{ width: 150 }} />
              </Space>
            </Col>
          )}
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong>View</Text>
              <Select value={viewMode} onChange={(v) => setViewMode(v)} style={{ width: 120 }}>
                <Select.Option value="all">All Members</Select.Option>
                <Select.Option value="present">Present Only</Select.Option>
                <Select.Option value="absent">Absent Only</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col flex="auto" />
          <Col>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => fetchAttendanceReport(true)} loading={loading}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {attendanceData && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="Total Members" value={attendanceData.summary.totalMembers} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Present Today" value={attendanceData.summary.presentCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Absent Today" value={attendanceData.summary.absentCount} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Attendance Rate" value={attendanceData.summary.overallAttendanceRate} suffix="%" prefix={<PercentageOutlined />} valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
          </Row>
          <Card>
            <Table
              columns={columns}
              dataSource={filteredMembers}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} members` }}
              scroll={{ x: 1200 }}
            />
          </Card>

          <Modal
            title={
              selectedMember
                ? `${selectedMember.firstName} ${selectedMember.lastName} – Attendance details`
                : 'Attendance details'
            }
            open={detailsModalOpen}
            onCancel={() => { setDetailsModalOpen(false); setSelectedMember(null); }}
            footer={<Button onClick={() => { setDetailsModalOpen(false); setSelectedMember(null); }}>Close</Button>}
            width={520}
          >
            {selectedMember && (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text type="secondary">Branch: </Text>
                  <Text strong>{selectedMember.branchName}</Text>
                </div>
                <div>
                  <Text type="secondary">Status: </Text>
                  <Tag color={selectedMember.status === 'present' ? 'success' : 'default'}>{selectedMember.status}</Tag>
                </div>
                <div>
                  <Text type="secondary">Attendance: </Text>
                  <Text strong>{selectedMember.totalPresent}/{selectedMember.totalDays} days ({selectedMember.attendanceRate}%)</Text>
                </div>
                {selectedMember.lastAttendance && (
                  <div>
                    <Text type="secondary">Last check-in: </Text>
                    <Text strong>{dayjs(selectedMember.lastAttendance).format('MMM D, YYYY h:mm A')}</Text>
                  </div>
                )}
                {(selectedMember.attendanceDetails?.length ?? 0) > 0 ? (
                  <>
                    <Text strong>Check-in history</Text>
                    <List
                      size="small"
                      dataSource={selectedMember.attendanceDetails ?? []}
                      renderItem={(item: { date?: string; time?: string; authMethod?: string; status?: string }, index: number) => (
                        <List.Item key={index}>
                          <Space>
                            <ClockCircleOutlined />
                            <Text>{item.date && item.time ? dayjs(`${item.date}T${item.time}`).format('MMM D, h:mm A') : item.date || (item as any).attendanceDate || '—'}</Text>
                            {item.authMethod && <Tag>{getAuthMethodText(item.authMethod)}</Tag>}
                          </Space>
                        </List.Item>
                      )}
                    />
                  </>
                ) : (
                  <Text type="secondary">No check-in history for this period.</Text>
                )}
              </Space>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
