'use client'

import React, { useState, useEffect } from 'react'
import { Select, Typography, Row, Col, Flex } from 'antd'

const { Title } = Typography
import { 
  AlertCircle, 
  CheckCircle, 
  Clock,
  CreditCard,
  Receipt,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { useBranchContext } from '../../contexts/BranchContext'
import { api } from '../../utils/api'
import { formatDisplayDate } from '../../constants/dateFormat'
import PageLoader from '../PageLoader'

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
  /** Tracked expenses from Expenses feature (separate from revenue/pending) */
  expensesAmount?: number;
  monthlyBreakdown: Record<string, { totalPaid: number; paymentCount: number }>;
  branches: Array<{
    branchId: string;
    branchName: string;
    totalPaid: number;
    paymentCount: number;
  }>;
  paidMembers?: Array<{
    firstName: string;
    lastName: string;
    phoneNumber: string;
    branchName: string;
    amount: number;
    paymentDate: string;
  }>;
  pendingMembers?: Array<{
    firstName: string;
    lastName: string;
    phoneNumber: string;
    branchName: string;
    pendingAmount: number;
    dueDate: string;
    memberId: string;
    membership: string;
    totalAmount: number;
    paidAmount: number;
  }>;
  pendingSummary?: {
    totalMembers: number;
    totalPendingAmount: number;
    averagePending: number;
  };
}

const BillingOverview: React.FC = () => {
  const { user } = useAuth()
  const { selectedBranch } = useBranchContext()
  const [dateRange, setDateRange] = useState('01/04/2021 - 30/04/2021')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => new Date().getMonth() + 1)
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year, label: String(year) }
  })
  const monthOptions = [
    { value: '', label: 'All Months' },
    ...Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      return {
        value: String(month),
        label: new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })
      }
    })
  ]

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedYear, selectedMonth, user, selectedBranch])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        setError('User not authenticated. Please login again.')
        return
      }
      
      const params: { year: number; month?: number; branchId?: string } = selectedMonth
        ? { year: selectedYear, month: selectedMonth }
        : { year: selectedYear }

      const isOwner = user.role === 'gym_owner'
      const branchScoped = isOwner && selectedBranch

      if (branchScoped) {
        params.branchId = selectedBranch as string
      }

      const response = isOwner && !branchScoped
        ? await api.payments.getGymOwnerAnalytics(params)
        : await api.payments.getBranchManagerAnalytics(params)

      // Expenses = tracked expenses from Expenses feature (separate from revenue/pending)
      let expensesAmount = 0
      try {
        const start = selectedMonth
          ? new Date(selectedYear, selectedMonth - 1, 1)
          : new Date(selectedYear, 0, 1)
        const end = selectedMonth
          ? new Date(selectedYear, selectedMonth, 0)
          : new Date(selectedYear, 11, 31)
        const startDate = start.toISOString().slice(0, 10)
        const endDate = end.toISOString().slice(0, 10)
        const expensesBranchId = branchScoped ? (selectedBranch as string) : undefined
        const expensesRes = await api.expenses.getTotal(startDate, endDate, expensesBranchId)
        const data = expensesRes as { total?: number; data?: { total?: number } }
        expensesAmount = Number(data?.total ?? data?.data?.total) || 0
      } catch {
        expensesAmount = 0
      }

      // Fetch paid members for selected period
      let paidMembers = []
      try {
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        console.log(`Fetching paid members for ${currentYear}-${currentMonth}`)
        
        // Use different API based on user role
        let paidResponse
        const isOwner = user?.role === 'gym_owner'
        const isManagerLike = user?.role === 'manager' || user?.role === 'branch_manager'

        if (isOwner && selectedBranch) {
          // Owner viewing a specific branch
          paidResponse = await api.payments.getByBranchId(selectedBranch)
        } else if (isOwner) {
          const gymId = user.gymId || user.id
          paidResponse = await api.payments.getByGymId(gymId)
        } else if (isManagerLike) {
          const branchId = user.branchId || user.id
          paidResponse = await api.payments.getByBranchId(branchId)
        } else {
          paidResponse = null
        }
        
        console.log('Paid members API response:', paidResponse)
        
        // Handle the response format: array of payment objects
        const rawPayments = paidResponse?.data || paidResponse || []
        console.log('Raw payments data:', rawPayments)
        
        // Transform the API response to match our display format
        paidMembers = rawPayments.map((payment: any) => {
          console.log('Processing payment:', payment)
          return {
            firstName: payment.name?.split(' ')[0] || 'Unknown',
            lastName: payment.name?.split(' ').slice(1).join(' ') || '',
            phoneNumber: 'N/A', // Not available in this response
            branchName: payment.branchName || 'N/A',
            amount: payment.paidAmount || 0,
            paymentDate: payment.paidAt || new Date().toISOString()
          }
        })
        
        console.log('Processed paid members:', paidMembers)
        
        // If no data, keep empty array
        if (paidMembers.length === 0) {
          console.log('No paid members found')
        }
      } catch (paidError) {
        console.warn('Failed to fetch paid members:', paidError)
        paidMembers = []
      }
      
      // Fetch pending members using the correct API
      let pendingMembers = []
      let pendingResponse = null
      try {
        // Use different API based on user role for pending payments
        const isOwner = user?.role === 'gym_owner'
        const isManagerLike = user?.role === 'manager' || user?.role === 'branch_manager'

        if (isOwner && selectedBranch) {
          // Owner viewing a specific branch: reuse branch pending logic
          pendingResponse = await api.payments.getPendingByBranchId(selectedBranch)
        } else if (isOwner) {
          pendingResponse = await api.request('/payments/analytics/overdue/gym-owner')
        } else if (isManagerLike) {
          const branchId = user.branchId || user.id
          pendingResponse = await api.payments.getPendingByBranchId(branchId)
        } else {
          pendingResponse = await api.request('/payments/pending')
        }
        
        console.log('Pending payments response:', pendingResponse)
        
        // Extract members from the response structure
        if (user?.role === 'gym_owner' && pendingResponse && pendingResponse.topOverdueMembers) {
          // Handle gym owner overdue response format
          console.log('Processing gym owner overdue response')
          
          // Create a map of memberId to branchName from branches data
          const memberBranchMap: { [key: string]: string } = {}
          if (pendingResponse.branches && Array.isArray(pendingResponse.branches)) {
            pendingResponse.branches.forEach((branch: any) => {
              if (branch.overdueMembersList && Array.isArray(branch.overdueMembersList)) {
                branch.overdueMembersList.forEach((member: any) => {
                  memberBranchMap[member.memberId] = branch.branchName
                })
              }
            })
          }
          
          pendingMembers = pendingResponse.topOverdueMembers.map((member: any) => ({
            firstName: member.memberName?.split(' ')[0] || 'Unknown',
            lastName: member.memberName?.split(' ').slice(1).join(' ') || '',
            phoneNumber: 'N/A', // Not available in this response
            branchName: memberBranchMap[member.memberId] || 'N/A',
            pendingAmount: member.overdueAmount || 0,
            dueDate: null, // No due date in this response
            memberId: member.memberId,
            membership: member.membership,
            totalAmount: member.totalAmount,
            paidAmount: member.paidAmount
          }))
          console.log('Processed overdue members:', pendingMembers)
        } else if (pendingResponse && pendingResponse.members && Array.isArray(pendingResponse.members)) {
          // Handle other response formats
          pendingMembers = pendingResponse.members.map((member: any) => ({
            firstName: member.memberName?.split(' ')[0] || 'Unknown',
            lastName: member.memberName?.split(' ').slice(1).join(' ') || '',
            phoneNumber: 'N/A', // Not available in this response
            branchName: member.branchName || 'N/A',
            pendingAmount: member.pendingAmount || 0,
            dueDate: member.membershipEndDate || member.lastPaymentDate || null,
            memberId: member.memberId,
            membership: member.membership,
            totalAmount: member.totalAmount,
            paidAmount: member.paidAmount
          }))
          console.log('Processed pending members:', pendingMembers)
        } else {
          console.log('No pending members found in response')
        }
      } catch (pendingError) {
        console.warn('Failed to fetch pending members:', pendingError)
        pendingMembers = []
      }
      
      // Create pending summary from response data
      let pendingSummary = null
      if (user?.role === 'gym_owner' && pendingResponse && pendingResponse.gymSummary) {
        // Use gym summary data for gym owners
        pendingSummary = {
          totalMembers: pendingResponse.gymSummary.totalOverdueMembers,
          totalPendingAmount: pendingResponse.gymSummary.totalOverdueAmount,
          averagePending: pendingResponse.gymSummary.averageOverdue
        }
        console.log('Using gym summary for pending summary:', pendingSummary)
      } else if (pendingResponse?.summary) {
        // Use regular summary data
        pendingSummary = pendingResponse.summary
      } else if (pendingMembers.length > 0) {
        // Calculate from member data if no summary available
        const totalPending = pendingMembers.reduce((sum: number, member: any) => sum + (member.pendingAmount || 0), 0)
        pendingSummary = {
          totalMembers: pendingMembers.length,
          totalPendingAmount: totalPending,
          averagePending: totalPending / pendingMembers.length
        }
      }
      
      // Combine analytics: Revenue=received only, Pending=unpaid only, Expenses=tracked expenses (separate)
      const combinedData: AnalyticsData = {
        ...response,
        expensesAmount,
        paidMembers,
        pendingMembers,
        pendingSummary,
        pendingByMembership: pendingResponse?.pendingByMembership || [],
        pendingByBranch: pendingResponse?.pendingByBranch || []
      }

      setAnalyticsData(combinedData)
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      if (err.message?.includes('403')) {
        setError('Access denied. You do not have permission to view billing analytics.')
      } else {
        setError(err.message || 'Failed to fetch analytics data')
      }
    } finally {
      setLoading(false)
    }
  }

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
    icon: Icon,
    percent,
  }: { 
    value: number;
    label: string;
    color: string;
    icon: React.ElementType;
    /** Optional percentage for the circular fill; falls back to 75 if not provided */
    percent?: number;
  }) => {
    const percentage = typeof percent === 'number' ? percent : 75;
    
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


  // Prepare chart data from analytics
  const prepareChartData = () => {
    if (!analyticsData) return []

    // Year view (All Months selected): show Jan–Dec
    if (!selectedMonth) {
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const breakdown = analyticsData.monthlyBreakdown || {}
      const year = analyticsData.period?.year || selectedYear

      return monthLabels.map((label, index) => {
        const monthNumber = index + 1
        const monthPadded = monthNumber.toString().padStart(2, '0')
        const fullKey = `${year}-${monthPadded}`

        let matchedKey: string | undefined

        if (Object.prototype.hasOwnProperty.call(breakdown, fullKey)) {
          matchedKey = fullKey
        } else if (Object.prototype.hasOwnProperty.call(breakdown, String(monthNumber))) {
          matchedKey = String(monthNumber)
        } else {
          matchedKey = Object.keys(breakdown).find((key) => {
            const [kYear, kMonth] = key.split('-')
            const kMonthNum = Number(kMonth)
            if (!Number.isNaN(kMonthNum) && Number(kYear) === year && kMonthNum === monthNumber) {
              return true
            }
            const asNumber = Number(key)
            if (!Number.isNaN(asNumber) && asNumber === monthNumber) return true
            return key.toLowerCase().startsWith(label.toLowerCase())
          })
        }

        const monthData = matchedKey
          ? (breakdown as Record<string, { totalPaid?: number }>)[matchedKey]
          : undefined

        return {
          label,
          amount: monthData?.totalPaid ?? 0
        }
      })
    }

    // Month view (specific month selected): show days 1..N using dailyBreakdown
    const year = analyticsData.period?.year || selectedYear
    const month = selectedMonth
    const daily = (analyticsData as any).dailyBreakdown || {}
    const daysInMonth = new Date(year, month, 0).getDate()

    const data = []
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = String(day)
      const dayData = daily[key] as { totalPaid?: number } | undefined
      data.push({
        label: String(day),
        amount: dayData?.totalPaid ?? 0
      })
    }
    return data
  }

  const chartData = prepareChartData()

  // Revenue trend: compare latest month to previous month (year view only)
  const revenueTrend = (() => {
    if (!chartData || chartData.length < 2 || selectedMonth) return null
    const order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const sorted = [...chartData].sort(
      (a, b) => order.indexOf(a.label) - order.indexOf(b.label)
    )
    const prev = sorted[sorted.length - 2]?.amount ?? 0
    const curr = sorted[sorted.length - 1]?.amount ?? 0
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  })()

  if (loading) {
    return <PageLoader message="Loading revenue…" />
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #FECACA',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <AlertCircle style={{ width: '3rem', height: '3rem', color: '#EF4444', margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#DC2626', margin: '0 0 0.5rem 0' }}>Error</h3>
          <p style={{ color: '#64748B', margin: '0 0 1rem 0' }}>{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            style={{
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Financial Overview</Title>
        </Col>
        <Col>
          <Flex align="center" gap={8}>
            <Select
              value={selectedYear}
              options={yearOptions}
              onChange={(value) => setSelectedYear(Number(value))}
              style={{ minWidth: 130 }}
            />
            <Select
              value={selectedMonth != null ? String(selectedMonth) : ''}
              options={monthOptions}
              onChange={(value) => setSelectedMonth(value ? Number(value) : null)}
              style={{ minWidth: 180 }}
            />
          </Flex>
        </Col>
      </Row>

      {/* Stats Section */}
      <div style={{marginBottom: 'clamp(2rem, 5vw, 3rem)'}}>
          {/* Financial Overview: Revenue=received, Pending=unpaid, Expenses=tracked expenses (separate) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 35vw, 240px), 1fr))',
            gap: 'clamp(1rem, 3vw, 1.5rem)',
            marginBottom: 'clamp(2rem, 5vw, 3rem)'
          }}>
            <CircularProgress 
              value={analyticsData?.summary?.totalPaidAmount || 0} 
              label="Revenue" 
              color="#22C55E"
              icon={TrendingUp}
              percent={analyticsData?.summary?.totalPaidAmount ? (analyticsData?.summary?.totalPaidAmount / (analyticsData?.summary?.totalPaidAmount + analyticsData?.summary?.totalPendingAmount)) * 100 : 0}
            />
            <CircularProgress 
              value={analyticsData?.summary?.totalPendingAmount || 0} 
              label="Overdue Amount" 
              color="#F59E0B"
              percent={analyticsData?.summary?.totalPendingAmount ? (analyticsData?.summary?.totalPendingAmount / (analyticsData?.summary?.totalPaidAmount + analyticsData?.summary?.totalPendingAmount)) * 100 : 0}
              icon={Clock}
            />
            <CircularProgress 
              value={analyticsData?.expensesAmount ?? 0} 
              label="Expenses" 
              color="#EF4444"
              percent={analyticsData?.expensesAmount ? (analyticsData?.expensesAmount / (analyticsData?.summary?.totalPaidAmount + analyticsData?.summary?.totalPendingAmount)) * 100 : 0}
              icon={Receipt}
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
                  color: revenueTrend === null
                    ? '#64748B'
                    : revenueTrend >= 0
                      ? '#10B981'
                      : '#EF4444'
                }}>
                  {revenueTrend !== null && (
                    revenueTrend >= 0
                      ? <TrendingUp style={{ width: '1.25rem', height: '1.25rem' }} />
                      : <TrendingDown style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                  <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)', fontWeight: '600' }}>
                    {revenueTrend === null
                      ? '—'
                      : `${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="label" 
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
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#22C55E"
                  strokeWidth={2.5}
                  fill="url(#colorAmount)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Month Revenue Section */}
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '1rem',
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: 'clamp(2rem, 5vw, 3rem)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <TrendingUp style={{
                width: '1.5rem',
                height: '1.5rem',
                color: 'white'
              }} />
            </div>
            <div>
              <h3 style={{
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                fontWeight: '600',
                color: '#1E293B',
                margin: '0 0 0.25rem 0'
              }}>
                {selectedMonth ? 'Revenue by branch' : 'Revenue by branch (year)'}
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                margin: 0
              }}>
                {selectedMonth
                  ? `Revenue (received only) for ${new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`
                  : `Revenue (received only) for ${selectedYear}`}
              </p>
            </div>
          </div>
          
          <div className="revenue-list-scroll" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
            {analyticsData?.branches && analyticsData.branches.length > 0 ? (
              analyticsData.branches.map((branch: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 0',
                  borderBottom: index < analyticsData.branches.length - 1 ? '1px solid #F1F5F9' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}>
                      {branch.branchName?.[0] || 'B'}
                    </div>
                    <div>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontWeight: '600',
                        color: '#1E293B',
                        fontSize: '0.875rem'
                      }}>
                        {branch.branchName}
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#64748B',
                        fontSize: '0.75rem'
                      }}>
                        {branch.totalMembers} members
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontWeight: '600',
                        color: '#16A34A',
                        fontSize: '0.875rem'
                      }}>
                        {formatCurrency(branch.totalPaid || 0)}
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#64748B',
                        fontSize: '0.75rem'
                      }}>
                        Revenue
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontWeight: '600',
                        color: '#D97706',
                        fontSize: '0.875rem'
                      }}>
                        {formatCurrency((branch as any).totalPendingAmount ?? (branch as any).totalOverdueAmount ?? 0)}
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#64748B',
                        fontSize: '0.75rem'
                      }}>
                        Overdue Amount
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem 0',
                color: '#64748B'
              }}>
                <TrendingUp style={{
                  width: '3rem',
                  height: '3rem',
                  color: '#E2E8F0',
                  marginBottom: '1rem'
                }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No branch data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Member Lists Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'clamp(1.5rem, 4vw, 2rem)',
          marginBottom: 'clamp(2rem, 5vw, 3rem)'
        }}>
          {/* Members Who Paid This Month */}
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '1rem',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  color: 'white'
                }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                  fontWeight: '600',
                  color: '#1E293B',
                  margin: '0 0 0.25rem 0'
                }}>
                  Paid This Month
                </h3>
                <p style={{
                  color: '#64748B',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  margin: 0
                }}>
                  Members who made payments this month
                </p>
              </div>
            </div>
            
            <div className="revenue-list-scroll" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
              {analyticsData?.paidMembers && analyticsData.paidMembers.length > 0 ? (
                analyticsData.paidMembers.map((member: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 0',
                    borderBottom: index < (analyticsData.paidMembers?.length || 0) - 1 ? '1px solid #F1F5F9' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {member.firstName?.[0] || member.name?.[0] || 'M'}
                      </div>
                      <div>
                        <p style={{
                          margin: '0 0 0.25rem 0',
                          fontWeight: '600',
                          color: '#1E293B',
                          fontSize: '0.875rem'
                        }}>
                          {member.firstName} {member.lastName}
                        </p>
                        <p style={{
                          margin: 0,
                          color: '#64748B',
                          fontSize: '0.75rem'
                        }}>
                          {member.branchName}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontWeight: '600',
                        color: '#10B981',
                        fontSize: '0.875rem'
                      }}>
                        ₹{member.amount?.toFixed(2) || '0.00'}
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#64748B',
                        fontSize: '0.75rem'
                      }}>
                        {member.paymentDate ? formatDisplayDate(member.paymentDate) : 'Recent'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 0',
                  color: '#64748B'
                }}>
                  <CheckCircle style={{
                    width: '3rem',
                    height: '3rem',
                    color: '#E2E8F0',
                    marginBottom: '1rem'
                  }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>No payments this month</p>
                </div>
              )}
            </div>
          </div>

          {/* Members with Pending Payments */}
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '1rem',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <Clock style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  color: 'white'
                }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                  fontWeight: '600',
                  color: '#1E293B',
                  margin: '0 0 0.25rem 0'
                }}>
                  Pending Payments
                </h3>
                <p style={{
                  color: '#64748B',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  margin: 0
                }}>
                  Members with outstanding payments
                </p>
              </div>
            </div>
            
            {/* Pending Summary */}
            {analyticsData?.pendingSummary && (
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '1rem',
                  textAlign: 'center'
                }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#92400E', fontWeight: '600' }}>
                      Total Members
                    </p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#92400E' }}>
                      {analyticsData.pendingSummary.totalMembers}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#92400E', fontWeight: '600' }}>
                      Total Pending
                    </p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#92400E' }}>
                      ₹{analyticsData.pendingSummary.totalPendingAmount?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#92400E', fontWeight: '600' }}>
                      Average
                    </p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#92400E' }}>
                      ₹{analyticsData.pendingSummary.averagePending?.toFixed(0) || '0'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="revenue-list-scroll" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
              {analyticsData?.pendingMembers && analyticsData.pendingMembers.length > 0 ? (
                analyticsData.pendingMembers.map((member: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 0',
                    borderBottom: index < (analyticsData.pendingMembers?.length || 0) - 1 ? '1px solid #F1F5F9' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {member.firstName?.[0] || member.name?.[0] || 'M'}
                      </div>
                      <div>
                        <p style={{
                          margin: '0 0 0.25rem 0',
                          fontWeight: '600',
                          color: '#1E293B',
                          fontSize: '0.875rem'
                        }}>
                          {member.firstName} {member.lastName}
                        </p>
                        <p style={{
                          margin: 0,
                          color: '#64748B',
                          fontSize: '0.75rem'
                        }}>
                          {member.branchName}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontWeight: '600',
                        color: '#F59E0B',
                        fontSize: '0.875rem'
                      }}>
                        ₹{member.pendingAmount?.toFixed(2) || '0.00'}
                      </p>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        color: '#64748B',
                        fontSize: '0.75rem'
                      }}>
                        {member.membership || 'Unknown Plan'}
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#64748B',
                        fontSize: '0.75rem'
                      }}>
                        Due: {member.dueDate ? formatDisplayDate(member.dueDate) : 'Overdue'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 0',
                  color: '#64748B'
                }}>
                  <Clock style={{
                    width: '3rem',
                    height: '3rem',
                    color: '#E2E8F0',
                    marginBottom: '1rem'
                  }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>No pending payments</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* No Data Message */}
        {!analyticsData && (
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '1rem',
            padding: 'clamp(2rem, 5vw, 3rem)',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ color: '#64748B', margin: '0 0 0.5rem 0' }}>No Analytics Data Available</h3>
            <p style={{ color: '#64748B', margin: 0 }}>No billing data found for the selected period. Try selecting a different year or month.</p>
          </div>
        )}
      </div>
  )
}

export default BillingOverview
