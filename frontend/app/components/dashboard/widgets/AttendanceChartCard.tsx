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
        <span style={{ color: 'rgba(255,255,255,0.95)' }}>
          <BarChartOutlined /> Attendance
        </span>
      }
      style={{
        borderRadius: 0,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
      styles={{
        header: { background: 'transparent', borderBottom: 'none', color: 'rgba(255,255,255,0.95)' },
        body: { minHeight: 280, background: 'transparent' },
      }}
    >
      {data.length === 0 ? (
        <Empty description={<span style={{ color: 'rgba(255,255,255,0.7)' }}>No attendance data</span>} />
      ) : (
        <div style={{ width: '100%', minWidth: 0, minHeight: 260 }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.9)' }} axisLine={{ stroke: 'rgba(255,255,255,0.3)' }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.9)' }} axisLine={{ stroke: 'rgba(255,255,255,0.3)' }} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: 10,
                  color: '#f1f5f9',
                }}
              />
              <Bar dataKey="count" fill="#22C55E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
