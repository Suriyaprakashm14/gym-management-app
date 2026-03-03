'use client';

import { Card, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AttendanceBar } from '../types';

interface AttendanceChartCardProps {
  data: AttendanceBar[];
}

export default function AttendanceChartCard({ data }: AttendanceChartCardProps) {
  return (
    <Card
      title={
        <span style={{ color: '#1f1f1f' }}>
          <BarChartOutlined /> Attendance Trend
        </span>
      }
      style={{
        borderRadius: 14,
        background: '#FFFFFF',
        border: '1px solid #f0f0f0',
      }}
      styles={{ body: { height: 300 } }}
    >
      {data.length === 0 ? (
        <Empty description={<span style={{ color: '#666666' }}>No attendance data</span>} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fill: '#666666' }} axisLine={{ stroke: '#d9d9d9' }} />
            <YAxis tick={{ fill: '#666666' }} axisLine={{ stroke: '#d9d9d9' }} />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #f0f0f0',
                borderRadius: 10,
                color: '#1f1f1f',
              }}
            />
            <Bar dataKey="count" fill="#1890ff" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
