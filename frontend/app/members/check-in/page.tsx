'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
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
  message
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
  dateRange: {
    startDate: string;
    endDate: string;
  };
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
    attendanceDetails: Array<{
      date: string;
      status: string;
      time: string;
      authMethod: string;
      confidence?: number;
    }>;
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
  attendanceDetails: Array<{
    date: string;
    status: string;
    time: string;
    authMethod: string;
    confidence?: number;
  }>;
  status: 'present' | 'absent';
}

export default function CheckInPage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<'all' | 'present' | 'absent'>('all');

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.attendance.getReport({
        period: selectedPeriod,
        ...(selectedPeriod === 'day' && { date: selectedDate.format('YYYY-MM-DD') })
      });
      setAttendanceData(response);
      message.success('Attendance data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance data';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Error fetching attendance report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceReport();
  }, [selectedPeriod, selectedDate]);

  const formatTime = (timeString: string) => {
    return dayjs(timeString).format('h:mm A');
  };

  const getAuthMethodIcon = (method: string) => {
    switch (method) {
      case 'face_recognition':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'dual_auth':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'fingerprint':
        return <ClockCircleOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

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

  // Combine present and absent members for unified table
  const allMembers: AttendanceMember[] = useMemo(() => {
    if (!attendanceData) return [];
    
    const presentMembers = attendanceData.presentMembers.map(member => ({
      key: member.memberId,
      ...member,
      status: 'present' as const
    }));
    
    const absentMembers = attendanceData.absentMembers.map(member => ({
      key: member.memberId,
      ...member,
      status: 'absent' as const
    }));
    
    return [...presentMembers, ...absentMembers];
  }, [attendanceData]);

  // Filter members based on view mode
  const filteredMembers = useMemo(() => {
    if (viewMode === 'present') {
      return allMembers.filter(member => member.status === 'present');
    } else if (viewMode === 'absent') {
      return allMembers.filter(member => member.status === 'absent');
    }
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
          <Avatar 
            size={40} 
            style={{ 
              backgroundColor: record.status === 'present' ? '#52c41a' : '#8c8c8c',
              verticalAlign: 'middle'
            }}
          >
            {record.firstName.charAt(0)}{record.lastName.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.firstName} {record.lastName}
            </div>
            <Tag color={record.status === 'present' ? 'success' : 'default'}>
              {record.status.toUpperCase()}
            </Tag>
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
          <Text strong>
            {lastAttendance ? formatTime(lastAttendance) : 'Never'}
          </Text>
          {record.attendanceDetails.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getAuthMethodText(record.attendanceDetails[0].authMethod)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Authentication',
      key: 'authMethod',
      width: 150,
      render: (_: unknown, record: AttendanceMember) => {
        if (record.attendanceDetails.length === 0) {
          return <Text type="secondary">N/A</Text>;
        }
        
        const authMethod = record.attendanceDetails[0].authMethod;
        return (
          <Space>
            {getAuthMethodIcon(authMethod)}
            <Text style={{ fontSize: 13 }}>
              {getAuthMethodText(authMethod)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Attendance Rate',
      key: 'attendanceRate',
      width: 200,
      render: (_: unknown, record: AttendanceMember) => (
        <Space direction="vertical" size={4}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 60, 
              height: 8, 
              backgroundColor: '#f0f0f0', 
              borderRadius: 4,
              marginRight: 8,
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  width: `${record.attendanceRate}%`, 
                  height: '100%', 
                  backgroundColor: record.status === 'present' ? '#52c41a' : '#ff4d4f',
                  transition: 'width 0.3s ease'
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
        <Space size={8}>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#13c2c2' }} />}
              onClick={() => console.log('View details', record.key)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Attendance Data"
        description={error}
        type="error"
        action={
          <Button size="small" danger onClick={fetchAttendanceReport}>
            Retry
          </Button>
        }
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
          Check-in Dashboard
        </Title>
        <Text type="secondary">Monitor member attendance and check-in status</Text>
      </div>

      {/* Controls */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong>Period</Text>
              <Select
                value={selectedPeriod}
                onChange={(value) => setSelectedPeriod(value)}
                style={{ width: 120 }}
              >
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
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || dayjs())}
                  style={{ width: 150 }}
                />
              </Space>
            </Col>
          )}
          
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong>View</Text>
              <Select
                value={viewMode}
                onChange={(value) => setViewMode(value)}
                style={{ width: 120 }}
              >
                <Select.Option value="all">All Members</Select.Option>
                <Select.Option value="present">Present Only</Select.Option>
                <Select.Option value="absent">Absent Only</Select.Option>
              </Select>
            </Space>
          </Col>
          
          <Col flex="auto" />
          
          <Col>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchAttendanceReport}
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {attendanceData && (
        <>
          {/* Summary Cards */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Members"
                  value={attendanceData.summary.totalMembers}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Present Today"
                  value={attendanceData.summary.presentCount}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Absent Today"
                  value={attendanceData.summary.absentCount}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Attendance Rate"
                  value={attendanceData.summary.overallAttendanceRate}
                  suffix="%"
                  prefix={<PercentageOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Members Table */}
          <Card>
            <Table
              columns={columns}
              dataSource={filteredMembers}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} members`,
              }}
              scroll={{ x: 1200 }}
              style={{ background: '#fff' }}
              rowClassName={(record) => 
                record.status === 'present' ? 'present-row' : 'absent-row'
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}