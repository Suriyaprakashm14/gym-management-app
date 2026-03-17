'use client'

import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  CreditCard,
  ArrowLeft
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../utils/api'
import { Select, DatePicker, Spin, Alert } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'

const { Option } = Select

interface AnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    year: number;
    month: number;
  };
  summary: {
    totalPaidAmount: number;
    totalPendingAmount: number;
    totalMembers: number;
    totalPayments: number;
    averagePayment: number;
  };
  monthlyBreakdown: Record<string, { totalPaid: number; paymentCount: number }>;
  branches: Array<{
    branchId: string;
    branchName: string;
    totalPaid: number;
    paymentCount: number;
  }>;
}

const BillingPage = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Payments')
  const [dateRange, setDateRange] = useState('01/04/2021 - 30/04/2021')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedYear, selectedMonth])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = selectedMonth ? { year: selectedYear, month: selectedMonth } : { year: selectedYear }
      const response = user?.role === 'gym_owner' 
        ? await api.payments.getGymOwnerAnalytics(params)
        : await api.payments.getBranchManagerAnalytics(params)
      
      setAnalyticsData(response)
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.message || 'Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Transform API data to component format
  const stats = analyticsData ? {
    pendingAmount: analyticsData.summary?.totalPendingAmount || 0,
    completedAmount: analyticsData.summary?.totalPaidAmount || 0,
    overdueAmount: 0, // This would need to be calculated separately
    totalRevenue: (analyticsData.summary?.totalPaidAmount || 0) + (analyticsData.summary?.totalPendingAmount || 0),
    monthlyRevenue: Object.entries(analyticsData.monthlyBreakdown || {}).map(([key, value]: [string, any]) => ({
      month: key,
      amount: value.totalPaid
    }))
  } : {
    pendingAmount: 0,
    completedAmount: 0,
    overdueAmount: 0,
    totalRevenue: 0,
    monthlyRevenue: []
  }

  const overduePayments = [
    {
      _id: '1',
      memberId: {
        _id: 'm1',
        firstName: 'Tony',
        lastName: 'Samson',
        email: 'tony@example.com'
      },
      amount: 90.00,
      paymentMethod: 'cash',
      description: 'Adults Monthly Fees',
      transactionDate: '2020-04-11',
      status: 'overdue'
    },
    {
      _id: '2',
      memberId: {
        _id: 'm2',
        firstName: 'Lillie',
        lastName: 'Robbins',
        email: 'lillie@example.com'
      },
      amount: 130.00,
      paymentMethod: 'card',
      description: 'Silver Membership Fees',
      transactionDate: '2021-04-02',
      status: 'overdue'
    }
  ]

  const recentPayments = [
    {
      _id: '3',
      memberId: {
        _id: 'm3',
        firstName: 'Micky',
        lastName: 'Sond',
        email: 'micky@example.com'
      },
      amount: 81.00,
      paymentMethod: 'upi',
      description: 'Adults Monthly Fees',
      transactionDate: '2021-04-10',
      status: 'completed'
    },
    {
      _id: '4',
      memberId: {
        _id: 'm4',
        firstName: 'Jenny',
        lastName: 'Carver',
        email: 'jenny@example.com'
      },
      amount: 25.00,
      paymentMethod: 'online',
      description: 'Adult monthly membership',
      transactionDate: '2021-04-10',
      status: 'completed'
    }
  ]

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${day}-${month}-${year}`;
  }

  const CircularProgress = ({ 
    value, 
    label, 
    color,
    icon: Icon
  }: { 
    value: number
    label: string
    color: string
    icon: React.ElementType
  }) => {
    const percentage = 75
    
    return (
      <div style={{
        position: 'relative',
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '1rem',
        padding: 'clamp(1.5rem, 4vw, 2rem)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{position: 'relative', width: '7rem', height: '7rem', marginBottom: '1rem'}}>
            <svg style={{width: '7rem', height: '7rem', transform: 'rotate(-90deg)'}}>
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="#E2E8F0"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke={color}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${percentage * 3.01} 301`}
                strokeLinecap="round"
                style={{transition: 'all 0.5s ease'}}
              />
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon style={{width: '1.75rem', height: '1.75rem', color: color}} />
            </div>
          </div>
          <div style={{textAlign: 'center'}}>
            <p style={{
              fontSize: 'clamp(1.125rem, 3vw, 1.375rem)',
              fontWeight: 'bold',
              color: '#1E293B',
              marginBottom: '0.25rem',
              margin: '0 0 0.25rem 0'
            }}>
              {formatCurrency(value)}
            </p>
            <p style={{fontSize: 'clamp(0.875rem, 2vw, 1rem)', color: '#64748B', margin: 0}}>
              {label}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const tabs = ['Overview', 'Payments', 'Recurring', 'Discounts', 'Payment Forms', 'Accounting', 'Settings']

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '90rem',
        margin: '0 auto',
        padding: 'clamp(1rem, 4vw, 2rem)'
      }}>
        
        {/* Header */}
        <div style={{marginBottom: 'clamp(2rem, 5vw, 3rem)'}}>
          
          <div style={{display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '0.5rem'}}>
            <div style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <CreditCard style={{
                width: 'clamp(1.5rem, 4vw, 2rem)',
                height: 'clamp(1.5rem, 4vw, 2rem)',
                color: 'white'
              }} />
            </div>
            <div>
              <h1 style={{
                fontSize: 'clamp(2rem, 6vw, 3rem)',
                fontWeight: 'bold',
                color: '#1E293B',
                margin: '0 0 0.25rem 0'
              }}>
                Billing & Payments
              </h1>
              <p style={{
                color: '#64748B',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                margin: 0
              }}>
                Manage your gym&apos;s financial transactions
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          marginBottom: 'clamp(2rem, 5vw, 3rem)',
          display: 'flex',
          gap: 'clamp(0.5rem, 2vw, 0.75rem)',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid #E2E8F0'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: 'clamp(0.625rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.5rem)',
                borderRadius: '0.5rem 0.5rem 0 0',
                whiteSpace: 'nowrap',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                border: 'none',
                borderBottom: tab === activeTab ? '3px solid #3B82F6' : '3px solid transparent',
                background: tab === activeTab ? 'white' : 'transparent',
                color: tab === activeTab ? '#3B82F6' : '#64748B',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (tab !== activeTab) {
                  e.currentTarget.style.color = '#1E293B';
                  e.currentTarget.style.background = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (tab !== activeTab) {
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.background = 'transparent';
                }
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Date Filter Controls */}
        <div style={{
          marginBottom: 'clamp(2rem, 5vw, 3rem)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>Year:</label>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120 }}
              suffixIcon={<CalendarOutlined />}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>Month:</label>
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: 120 }}
              placeholder="All months"
              allowClear
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <Option key={month} value={month}>
                  {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                </Option>
              ))}
            </Select>
          </div>
          
          <button
            onClick={fetchAnalyticsData}
            style={{
              padding: '0.5rem 1rem',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Refresh
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '2rem' }}
          />
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin size="large" />
            <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading analytics data...</p>
          </div>
        )}

        {/* Stats Section */}
        <div style={{marginBottom: 'clamp(2rem, 5vw, 3rem)'}}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'clamp(1rem, 3vw, 1.5rem)',
            marginBottom: 'clamp(2rem, 5vw, 2.5rem)',
            flexWrap: 'wrap'
          }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 'bold',
                color: '#1E293B',
                margin: '0 0 0.25rem 0'
              }}>
                Financial Overview
              </h2>
              <p style={{
                color: '#64748B',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                margin: 0
              }}>
                Track your gym&apos;s revenue and payment statistics
              </p>
            </div>
            <select 
              style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                color: '#1E293B',
                padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                borderRadius: '0.5rem',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
              }}>
              <option>01/04/2021 - 30/04/2021</option>
              <option>01/05/2021 - 31/05/2021</option>
              <option>01/06/2021 - 30/06/2021</option>
            </select>
          </div>

          {/* Circular Progress Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 35vw, 240px), 1fr))',
            gap: 'clamp(1rem, 3vw, 1.5rem)',
            marginBottom: 'clamp(2rem, 5vw, 3rem)'
          }}>
            <CircularProgress 
              value={stats.pendingAmount} 
              label="Pending" 
              color="#F59E0B"
              icon={Clock}
            />
            <CircularProgress 
              value={stats.completedAmount} 
              label="Completed" 
              color="#10B981"
              icon={CheckCircle}
            />
            <CircularProgress 
              value={stats.overdueAmount} 
              label="Overdue" 
              color="#EF4444"
              icon={AlertCircle}
            />
            <CircularProgress 
              value={stats.totalRevenue} 
              label="Total Revenue" 
              color="#8B5CF6"
              icon={TrendingUp}
            />
          </div>

          {/* Revenue Bar Chart */}
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '1rem',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{marginBottom: 'clamp(1rem, 3vw, 1.5rem)'}}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                    fontWeight: '600',
                    color: '#1E293B',
                    margin: '0 0 0.25rem 0'
                  }}>
                    Revenue Trends
                  </h3>
                  <p style={{
                    color: '#64748B',
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    margin: 0
                  }}>
                    Monthly revenue analysis
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#10B981'
                }}>
                  <TrendingUp style={{width: '1.25rem', height: '1.25rem'}} />
                  <span style={{fontSize: 'clamp(0.875rem, 2vw, 1rem)', fontWeight: '600'}}>+12.5%</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748B" 
                  fontSize={12}
                  tick={{ fill: '#64748B' }}
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={12}
                  tick={{ fill: '#64748B' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => {
                    const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                    return [formatCurrency(numeric), 'Revenue'] as [string, string];
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="url(#colorAmount)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overdue Payments Table */}
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '1rem',
          marginBottom: 'clamp(2rem, 5vw, 2.5rem)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'clamp(1rem, 3vw, 1.5rem)',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            borderBottom: '1px solid #E2E8F0',
            flexWrap: 'wrap'
          }}>
            <div>
              <h3 style={{
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                fontWeight: '600',
                color: '#1E293B',
                margin: '0 0 0.25rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle style={{width: '1.5rem', height: '1.5rem', color: '#EF4444'}} />
                Overdue Payments
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                margin: 0
              }}>
                {overduePayments.length} payments require immediate attention
              </p>
            </div>
            <button style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: 'white',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              fontWeight: '600',
              padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}>
              VIEW ALL OVERDUE
            </button>
          </div>
          
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', minWidth: '700px', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: '#F8FAFC'}}>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Member
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Amount
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Description
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {overduePayments.map((payment) => (
                  <tr 
                    key={payment._id} 
                    style={{
                      borderTop: '1px solid #E2E8F0',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <div style={{
                          width: 'clamp(2.5rem, 5vw, 3rem)',
                          height: 'clamp(2.5rem, 5vw, 3rem)',
                          borderRadius: '0.75rem',
                          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'
                        }}>
                          {payment.memberId.firstName.charAt(0)}
                        </div>
                        <div>
                          <p style={{
                            fontWeight: '600',
                            color: '#1E293B',
                            margin: '0 0 0.125rem 0',
                            fontSize: 'clamp(0.9rem, 2.25vw, 1rem)'
                          }}>
                            {payment.memberId.firstName} {payment.memberId.lastName}
                          </p>
                          <p style={{
                            fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                            color: '#64748B',
                            margin: 0
                          }}>
                            {payment.memberId.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <p style={{
                        fontWeight: 'bold',
                        color: '#1E293B',
                        fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                        margin: '0 0 0.125rem 0'
                      }}>
                        {formatCurrency(payment.amount)}
                      </p>
                      <p style={{
                        fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                        color: '#64748B',
                        margin: 0,
                        textTransform: 'capitalize'
                      }}>
                        {payment.paymentMethod}
                      </p>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <p style={{
                        color: '#475569',
                        fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                        margin: 0
                      }}>
                        {payment.description}
                      </p>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '0.5rem',
                        padding: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <AlertCircle style={{width: '1rem', height: '1rem', color: '#EF4444'}} />
                        <div style={{color: '#DC2626'}}>
                          <p style={{
                            fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                            fontWeight: '500',
                            margin: '0 0 0.125rem 0'
                          }}>
                            {formatDate(payment.transactionDate)}
                          </p>
                          <p style={{
                            fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                            fontWeight: 'bold',
                            margin: 0,
                            textTransform: 'uppercase'
                          }}>
                            {payment.status}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                        <button style={{
                          border: '1px solid #E2E8F0',
                          background: 'white',
                          color: '#475569',
                          fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                          fontWeight: '600',
                          padding: 'clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}>
                          INVOICE
                        </button>
                        <button style={{
                          border: '1px solid #E2E8F0',
                          background: 'white',
                          color: '#475569',
                          fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                          fontWeight: '600',
                          padding: 'clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}>
                          REMIND
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments Table */}
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '1rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'clamp(1rem, 3vw, 1.5rem)',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            borderBottom: '1px solid #E2E8F0',
            flexWrap: 'wrap'
          }}>
            <div>
              <h3 style={{
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                fontWeight: '600',
                color: '#1E293B',
                margin: '0 0 0.25rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle style={{width: '1.5rem', height: '1.5rem', color: '#10B981'}} />
                Recent Payments
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                margin: 0
              }}>
                Successfully processed transactions
              </p>
            </div>
            <button style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              fontWeight: '600',
              padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}>
              VIEW ALL PAYMENTS
            </button>
          </div>
          
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', minWidth: '700px', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: '#F8FAFC'}}>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Member
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Amount
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Description
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '1rem clamp(1rem, 3vw, 1.5rem)',
                    textAlign: 'left',
                    fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                    color: '#64748B',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr 
                    key={payment._id} 
                    style={{
                      borderTop: '1px solid #E2E8F0',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <div style={{
                          width: 'clamp(2.5rem, 5vw, 3rem)',
                          height: 'clamp(2.5rem, 5vw, 3rem)',
                          borderRadius: '0.75rem',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'
                        }}>
                          {payment.memberId.firstName.charAt(0)}
                        </div>
                        <div>
                          <p style={{
                            fontWeight: '600',
                            color: '#1E293B',
                            margin: '0 0 0.125rem 0',
                            fontSize: 'clamp(0.9rem, 2.25vw, 1rem)'
                          }}>
                            {payment.memberId.firstName} {payment.memberId.lastName}
                          </p>
                          <p style={{
                            fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                            color: '#64748B',
                            margin: 0
                          }}>
                            {payment.memberId.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <p style={{
                        fontWeight: 'bold',
                        color: '#1E293B',
                        fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                        margin: '0 0 0.125rem 0'
                      }}>
                        {formatCurrency(payment.amount)}
                      </p>
                      <p style={{
                        fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                        color: '#64748B',
                        margin: 0,
                        textTransform: 'capitalize'
                      }}>
                        {payment.paymentMethod}
                      </p>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <p style={{
                        color: '#475569',
                        fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                        margin: 0
                      }}>
                        {payment.description}
                      </p>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <div style={{
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '0.5rem',
                        padding: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <CheckCircle style={{width: '1rem', height: '1rem', color: '#10B981'}} />
                        <div style={{color: '#059669'}}>
                          <p style={{
                            fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                            fontWeight: '500',
                            margin: '0 0 0.125rem 0'
                          }}>
                            {formatDate(payment.transactionDate)}
                          </p>
                          <p style={{
                            fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                            fontWeight: 'bold',
                            margin: 0,
                            textTransform: 'uppercase'
                          }}>
                            {payment.status}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{padding: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <button style={{
                        border: '1px solid #E2E8F0',
                        background: 'white',
                        color: '#475569',
                        fontSize: 'clamp(0.75rem, 1.75vw, 0.875rem)',
                        fontWeight: '600',
                        padding: 'clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}>
                        VIEW INVOICE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillingPage
