'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Button,
  Avatar,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { Title, Text } = Typography;


const BellIcon = () => <span role="img" aria-label="bell">🔔</span>;

interface DashboardData {
  payments: {
    scheduled: number;
    paid: number;
    overdue: number;
  };
  attendance: Array<{ name: string; count: number }>;
  todayCheckIns: Array<{
    memberName: string;
    checkInTime: string;
    memberId: string;
    branchName?: string;
    authMethod?: string;
  }>;
  overduePayments: Array<{
    memberName: string;
    amount: number;
    description: string;
    dueDate?: string;
    memberId?: string;
  }>;
  notifications: Array<{
    name: string;
    date: string;
    message: string;
    color: string;
  }>;
}

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Fetch payments analytics
      console.log('Fetching payments analytics for user role:', user?.role);
      let paymentsResponse = null;
      try {
        paymentsResponse = user?.role === 'gym_owner' 
          ? await api.payments.getGymOwnerAnalytics({ year: new Date().getFullYear() })
          : await api.payments.getBranchManagerAnalytics({ year: new Date().getFullYear() });
        console.log('Payments analytics response:', paymentsResponse);
      } catch (paymentsError) {
        console.warn('Payments analytics API failed:', paymentsError);
        paymentsResponse = null;
      }

      // Fetch attendance data using weekly endpoint
      console.log('Fetching weekly attendance data...');
      
      let attendanceResponse = null;
      try {
        attendanceResponse = await api.request('/attendance/report/weekly');
        console.log('Attendance response:', attendanceResponse);
      } catch (attendanceError) {
        console.warn('Attendance API failed, using default data:', attendanceError);
        // Continue with default attendance data
      }

      // Fetch today's check-ins using the correct API endpoint
      console.log('Fetching today\'s check-ins...');
      
      let todayCheckIns = [];
      try {
        // Use the correct API endpoint for today's attendance
        const todayResponse = await api.request('/attendance/report?period=day');
        console.log('Today\'s check-ins response:', todayResponse);
        
        // Process the response based on the actual API structure
        if (todayResponse) {
          console.log('API Response structure:', todayResponse);
          
          // Extract present members from the API response
          const presentMembers = todayResponse.presentMembers || [];
          console.log('Present members found:', presentMembers.length);
          
          if (presentMembers.length > 0) {
            // Process each present member and their attendance details
            todayCheckIns = presentMembers.map((member: any) => {
              console.log('Processing member:', member);
              
              // Get the most recent attendance detail
              const latestAttendance = member.attendanceDetails && member.attendanceDetails.length > 0 
                ? member.attendanceDetails[member.attendanceDetails.length - 1] 
                : null;
              
              if (latestAttendance && latestAttendance.time) {
                // Format the time
                const checkInTime = new Date(latestAttendance.time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                
                return {
                  memberName: `${member.firstName} ${member.lastName}`,
                  checkInTime: checkInTime,
                  memberId: member.memberId,
                  branchName: member.branchName,
                  authMethod: latestAttendance.authMethod
                };
              } else {
                // Fallback if no attendance details
                return {
                  memberName: `${member.firstName} ${member.lastName}`,
                  checkInTime: 'Time not available',
                  memberId: member.memberId,
                  branchName: member.branchName,
                  authMethod: 'Unknown'
                };
              }
            });
            
            console.log('Processed check-ins from API:', todayCheckIns);
          } else {
            console.log('No present members found');
            todayCheckIns = [];
          }
        } else {
          console.log('Invalid API response or no data');
          todayCheckIns = [];
        }
      } catch (checkInError) {
        console.warn('Today\'s check-ins API failed:', checkInError);
        todayCheckIns = [];
      }

      // Fetch overdue payments data
      console.log('Fetching overdue payments...');
      console.log('User role:', user?.role);
      let overdueData = 0;
      let overduePaymentsList: Array<{
        memberName: string;
        amount: number;
        description: string;
        dueDate?: string;
        memberId?: string;
      }> = [];
      
      try {
        const apiEndpoint = user?.role === 'gym_owner' 
          ? '/payments/analytics/overdue/gym-owner'
          : '/payments/analytics/overdue/branch-manager';
        
        console.log('Using API endpoint:', apiEndpoint);
        
        const overdueResponse = await api.request(apiEndpoint);
        
        console.log('Overdue payments response:', overdueResponse);
        
        // Extract overdue amount and payments list from response
        console.log('Processing overdue response...');
        
        if (overdueResponse) {
          // Try different response structures
          let responseData = null;
          
          if (Array.isArray(overdueResponse)) {
            responseData = { payments: overdueResponse };
          } else {
            responseData = overdueResponse;
          }
          
          console.log('Response data structure:', responseData);
          
          // Extract total overdue amount
          overdueData = responseData?.totalOverdueAmount || 
                       responseData?.overdueAmount || 
                       responseData?.total || 
                       responseData?.amount || 
                       responseData?.totalAmount || 0;
          
          console.log('Extracted overdue amount:', overdueData);
          
          // Extract overdue payments list - try multiple possible structures
          let paymentsArray = null;
          
          if (responseData?.overduePayments && Array.isArray(responseData.overduePayments)) {
            paymentsArray = responseData.overduePayments;
            console.log('Found overduePayments array:', paymentsArray.length);
          } else if (responseData?.payments && Array.isArray(responseData.payments)) {
            paymentsArray = responseData.payments;
            console.log('Found payments array:', paymentsArray.length);
          } else if (responseData?.overdue && Array.isArray(responseData.overdue)) {
            paymentsArray = responseData.overdue;
            console.log('Found overdue array:', paymentsArray.length);
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            paymentsArray = responseData.data;
            console.log('Found data array:', paymentsArray.length);
          } else if (Array.isArray(responseData)) {
            paymentsArray = responseData;
            console.log('Response is direct array:', paymentsArray.length);
          }
          
          if (paymentsArray && paymentsArray.length > 0) {
            console.log('Processing payments array...');
            overduePaymentsList = paymentsArray.map((payment: any, index: number) => {
              console.log(`Processing payment ${index}:`, payment);
              
              // Extract member name
              let memberName = 'Unknown Member';
              if (payment.member) {
                if (payment.member.firstName && payment.member.lastName) {
                  memberName = `${payment.member.firstName} ${payment.member.lastName}`;
                } else if (payment.member.name) {
                  memberName = payment.member.name;
                }
              } else if (payment.memberName) {
                memberName = payment.memberName;
              } else if (payment.firstName && payment.lastName) {
                memberName = `${payment.firstName} ${payment.lastName}`;
              }
              
              // Extract amount
              const amount = payment.amount || payment.overdueAmount || payment.totalAmount || 0;
              
              // Extract description
              const description = payment.description || payment.type || payment.paymentType || 'Membership Fee';
              
              // Extract due date
              const dueDate = payment.dueDate || payment.due_date || payment.dueDate || null;
              
              // Extract member ID
              const memberId = payment.memberId || payment.member?.id || payment.id;
              
              const processedPayment = {
                memberName,
                amount,
                description,
                dueDate,
                memberId
              };
              
              console.log(`Processed payment ${index}:`, processedPayment);
              return processedPayment;
            });
            
            console.log('Final overdue payments list:', overduePaymentsList);
          } else {
            console.log('No payments array found in response');
          }
        } else {
          console.log('No response received from overdue API');
        }
        
        console.log('Overdue amount:', overdueData);
        console.log('Overdue payments list:', overduePaymentsList);
      } catch (overdueError) {
        console.warn('Overdue payments API failed, using default value:', overdueError);
        overdueData = 0;
        overduePaymentsList = [];
      }
      
      // If no overdue payments found, show a message
      if (overduePaymentsList.length === 0) {
        console.log('No overdue payments found, showing empty state');
      }

      // Process the data
      const processedData: DashboardData = {
        payments: {
          scheduled: paymentsResponse?.summary?.totalPendingAmount || 0,
          paid: paymentsResponse?.summary?.totalPaidAmount || 0,
          overdue: overdueData,
        },
        attendance: processAttendanceData(attendanceResponse),
        todayCheckIns: todayCheckIns,
        overduePayments: overduePaymentsList,
        notifications: [], // No default notifications
      };

      setDashboardData(processedData);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
      // Set empty data on error
      setDashboardData({
        payments: {
          scheduled: 0,
          paid: 0,
          overdue: 0,
        },
        attendance: [],
        todayCheckIns: [],
        overduePayments: [],
        notifications: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const processTodayCheckIns = (checkInData: any) => {
    console.log('Processing today\'s check-ins:', checkInData);
    
    if (!checkInData) {
      console.log('No check-in data provided');
      return [];
    }

    // Handle different data structures
    let records = [];
    if (Array.isArray(checkInData)) {
      records = checkInData;
    } else if (checkInData.data && Array.isArray(checkInData.data)) {
      records = checkInData.data;
    } else if (checkInData.attendance && Array.isArray(checkInData.attendance)) {
      records = checkInData.attendance;
    } else if (checkInData.checkIns && Array.isArray(checkInData.checkIns)) {
      records = checkInData.checkIns;
    } else if (checkInData.report && Array.isArray(checkInData.report)) {
      records = checkInData.report;
    } else if (checkInData.today && Array.isArray(checkInData.today)) {
      records = checkInData.today;
    } else if (checkInData.daily && Array.isArray(checkInData.daily)) {
      records = checkInData.daily;
    } else {
      console.log('Unrecognized data structure:', checkInData);
      console.log('Available keys:', Object.keys(checkInData));
      return [];
    }

    console.log('Processing records:', records.length);

    return records.map((record: any, index: number) => {
      console.log(`Processing record ${index}:`, record);
      
      // Extract member name from different possible fields
      let memberName = 'Unknown Member';
      
      if (record.memberName) {
        memberName = record.memberName;
      } else if (record.member && record.member.firstName && record.member.lastName) {
        memberName = `${record.member.firstName} ${record.member.lastName}`;
      } else if (record.member && record.member.name) {
        memberName = record.member.name;
      } else if (record.name) {
        memberName = record.name;
      } else if (record.firstName && record.lastName) {
        memberName = `${record.firstName} ${record.lastName}`;
      } else {
        memberName = `Member ${index + 1}`;
      }

      // Extract and format check-in time
      const checkInTime = record.checkInTime || record.checkIn || record.timestamp || record.createdAt || record.date;
      let formattedTime = 'Unknown Time';
      
      if (checkInTime) {
        try {
          const date = new Date(checkInTime);
          if (!isNaN(date.getTime())) {
            formattedTime = date.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
          }
        } catch (error) {
          console.warn('Error formatting time:', error);
        }
      }

      const result = {
        memberName,
        checkInTime: formattedTime,
        memberId: record.memberId || record.member?.id || record.id || index.toString()
      };
      
      console.log('Processed check-in:', result);
      return result;
    });
  };

  const processAttendanceData = (attendanceResponse: any) => {
    console.log('Processing weekly attendance data:', attendanceResponse);
    
    // Process attendance data to match the chart format
    if (!attendanceResponse) {
      console.log('No attendance response');
      return [];
    }

    // Try different possible data structures for weekly report
    let weeklyData = null;
    if (attendanceResponse.data) {
      weeklyData = attendanceResponse.data;
    } else if (attendanceResponse.weekly) {
      weeklyData = attendanceResponse.weekly;
    } else if (attendanceResponse.attendance) {
      weeklyData = attendanceResponse.attendance;
    } else if (Array.isArray(attendanceResponse)) {
      weeklyData = attendanceResponse;
    }

    console.log('Found weekly data:', weeklyData);

    // If we have weekly data in the expected format (array of days with counts)
    if (weeklyData && Array.isArray(weeklyData)) {
      // Check if it's already in the right format (array of {name, count} objects)
      if (weeklyData.length > 0 && weeklyData[0].name && typeof weeklyData[0].count === 'number') {
        console.log('Data is already in correct format:', weeklyData);
        return weeklyData;
      }
    }

    // If we have daily breakdown data
    if (weeklyData && typeof weeklyData === 'object') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const attendanceByDay = days.map(day => ({
        name: day,
        count: weeklyData[day.toLowerCase()] || weeklyData[day] || 0
      }));
      
      console.log('Processed daily breakdown:', attendanceByDay);
      
      // If we have some real data, return it
      if (attendanceByDay.some(day => day.count > 0)) {
        return attendanceByDay;
      }
    }

    // If no real data, return empty array
    console.log('No attendance data found');
    return [];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Use dashboard data or fallback to default
  const payments = dashboardData?.payments || {
    scheduled: 0,
    paid: 0,
    overdue: 0,
  };

  const attendanceData = dashboardData?.attendance || [];
  const todayCheckIns = dashboardData?.todayCheckIns || [];
  const overduePayments = dashboardData?.overduePayments || [];
  const notifications = dashboardData?.notifications || [];

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
  return (
    <>
      {/* Top Blue Section */}
      <div
        style={{
          backgroundColor: 'rgb(64, 105, 150)',
          padding: '24px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          minHeight: 560,
          color: 'white',
        }}
      >
        <Title level={3} style={{ color: 'white' }}>Dashboard</Title>
        <Title level={4} style={{ color: 'white' }}>Payments this month</Title>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap', 
          paddingTop: 24,
          gap: '24px'
        }}>
          {/* Scheduled Payment */}
          <div style={{ textAlign: 'center', minWidth: '150px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              border: '8px solid #1890ff',
              borderTop: '8px solid rgba(24, 144, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1890ff'
              }}>
                72%
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff', marginBottom: 4 }}>
              {formatCurrency(payments.scheduled)}
            </div>
            <p style={{ margin: 0, color: 'white' }}><strong>Scheduled</strong></p>
          </div>
          
          {/* Paid Payment */}
          <div style={{ textAlign: 'center', minWidth: '150px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              border: '8px solid #52c41a',
              borderTop: '8px solid rgba(82, 196, 26, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#52c41a'
              }}>
                31%
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a', marginBottom: 4 }}>
              {formatCurrency(payments.paid)}
            </div>
            <p style={{ margin: 0, color: 'white' }}><strong>Paid</strong></p>
          </div>
          
          {/* Overdue Payment */}
          <div style={{ textAlign: 'center', minWidth: '150px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              border: '8px solid #ff4d4f',
              borderTop: '8px solid rgba(255, 77, 79, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ff4d4f'
              }}>
                10%
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f', marginBottom: 4 }}>
              {formatCurrency(payments.overdue)}
            </div>
            <p style={{ margin: 0, color: 'white' }}><strong>Overdue</strong></p>
          </div>
          <div style={{ 
            width: '400px', 
            height: '250px',
            minWidth: '300px',
            flex: '0 0 auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16, fontSize: '16px', fontWeight: 'bold' }}>
              Attendance
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'white', fontSize: 12 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                />
                <YAxis 
                  tick={{ fill: 'white', fontSize: 12 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} people`, 'Attendance']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="count" fill="url(#colorUv)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#91e8d6" />
                    <stop offset="100%" stopColor="#3079b8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Floating Cards Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '-80px', 
        padding: '0 24px',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Today Check-ins */}
        <Card style={{ 
          width: '400px', 
          minWidth: '300px',
          borderRadius: 16, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          flex: '0 0 auto'
        }}>
          <Title level={5}><ClockCircleOutlined /> Today Check-in</Title>
      {todayCheckIns.length > 0 ? (
        todayCheckIns.map((checkIn, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12,
            padding: '8px 0',
            borderBottom: index < todayCheckIns.length - 1 ? '1px solid #f0f0f0' : 'none'
          }}>
            <div style={{ flex: 1 }}>
              <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
                <ClockCircleOutlined /> {checkIn.checkInTime}
              </Text>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>
                {checkIn.memberName}
              </p>
              {checkIn.branchName && (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
                  📍 {checkIn.branchName}
                </p>
              )}
              {checkIn.authMethod && (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#999' }}>
                  🔐 {checkIn.authMethod.replace('_', ' ')}
                </p>
              )}
            </div>
            <div>
              <CheckCircleOutlined style={{ color: 'green', fontSize: '16px' }} />
            </div>
          </div>
        ))
      ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              <ClockCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <p>No check-ins today</p>
            </div>
          )}
        </Card>

        {/* Right Column */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 24,
          flex: '1',
          minWidth: '300px'
        }}>
          {/* Notifications */}
          <Card style={{ 
            width: '500px', 
            maxWidth: '100%',
            borderRadius: 16, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            flex: '0 0 auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5}><BellIcon /> Notifications</Title>
              <Button type="link">Dismiss All</Button>
            </div>
            {notifications.map((note, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Avatar style={{ backgroundColor: note.color, marginRight: 12 }}>
                  {note.name[0]}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong>{note.name}</Text>
                  <div style={{ fontSize: 12, color: '#888' }}>{note.date}</div>
                  <div>{note.message}</div>
                </div>
                <Button type="link">Dismiss</Button>
              </div>
            ))}
          </Card>

          {/* Overdue Card */}
          <Card style={{ 
            width: '500px', 
            maxWidth: '100%',
            borderRadius: 16, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            flex: '0 0 auto'
          }}>
            <Title level={5}><ClockCircleOutlined /> Overdue Payments</Title>
            {dashboardData?.overduePayments && dashboardData.overduePayments.length > 0 ? (
              dashboardData.overduePayments.slice(0, 3).map((payment, index) => (
                <div key={index} style={{ 
                  marginBottom: 12,
                  padding: '8px 0',
                  borderBottom: index < Math.min(dashboardData.overduePayments.length, 3) - 1 ? '1px solid #f0f0f0' : 'none'
                }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    <strong>{payment.memberName}</strong> - ₹{payment.amount.toFixed(2)} - {payment.description}
                  </p>
                  {payment.dueDate && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                <ClockCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                <p>No overdue payments</p>
              </div>
            )}
            {dashboardData?.overduePayments && dashboardData.overduePayments.length > 3 && (
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <Button type="primary">View All ({dashboardData.overduePayments.length})</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default DashboardContent;
