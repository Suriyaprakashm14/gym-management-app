'use client';

import React, { useEffect, useState } from 'react';
import { formatDisplayDate } from '../../constants/dateFormat';
import {
  Modal,
  Descriptions,
  Avatar,
  Tag,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Spin,
  Alert,
  Divider,
  Button,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  IdcardOutlined,
  HomeOutlined,
  HeartOutlined,
  FileTextOutlined,
  ContactsOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { api } from '../../utils/api';
import { useAppSelector } from '../../redux/hooks';

const { Title, Text } = Typography;

function getAvatarSrc(image: string | undefined | null): string | undefined {
  if (!image || typeof image !== 'string') return undefined;
  if (image.startsWith('data:')) return image;
  return `data:image/jpeg;base64,${image}`;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

interface MemberPersonalDetails {
  _id: string;
  memberId: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  zipcode?: string;
  state?: string;
  country?: string;
  phoneNumber?: string;
  emergencyContacts?: EmergencyContact[];
  dateOfBirth?: string;
  totalAmount?: number;
  paidAmount?: number;
}

interface MemberDetails {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  age: number;
  dob: string;
  membership: string;
  expires: string;

  lastVisit: string;
  billingAmount: string;
  billingDate: string;
  billingStatus: string;
  status: string;
  personalDetails?: MemberPersonalDetails;
  /** Profile image (base64 or data URL) */
  image?: string;
}

interface MemberDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  memberId: string | null;
}

const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  visible,
  onClose,
  memberId,
}) => {
  const [personalDetails, setPersonalDetails] = useState<MemberPersonalDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get member data from Redux store
  const { members } = useAppSelector((state) => state.members);
  const memberDetails = members.find((m: any) => m.id === memberId);

  useEffect(() => {
    if (visible && memberId) {
      fetchPersonalDetails();
    }
  }, [visible, memberId]);

  const fetchPersonalDetails = async () => {
    if (!memberId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch personal details
      const personalResponse = await api.membersPersonalDetails.getByMemberId(memberId);
      setPersonalDetails(personalResponse.data || personalResponse);
    } catch (personalError) {
      console.log('No personal details found for this member');
      setPersonalDetails(null);
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
      case 'long term inactive':
        return 'default';
      default:
        return 'processing';
    }
  };

  const getBillingStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>Member Details</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      style={{ top: 24 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        },
        content: {
          overflow: 'hidden',
        },
      }}
    >
      {!memberDetails ? (
        <Alert
          message="Error"
          description="Member not found"
          type="error"
          showIcon
        />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading personal details...</div>
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
        />
      ) : (
        <div>
          {/* Member Header */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col>
                <Avatar
                  size={80}
                  src={getAvatarSrc(memberDetails.image)}
                  style={{ backgroundColor: memberDetails.image ? 'transparent' : '#1890ff' }}
                  icon={!memberDetails.image ? <UserOutlined /> : undefined}
                >
                  {!memberDetails.image && (!memberDetails.image &&
                    (memberDetails.name?.split(' ').map(n => n[0]).join('') || 'M'))}
                </Avatar>
              </Col>
              <Col flex={1}>
                <Title level={3} style={{ margin: 0 }}>
                  {memberDetails.name || `${memberDetails.firstName || ''} ${memberDetails.lastName || ''}`.trim()}
                </Title>
                <Space>
                  <Tag color={getStatusColor(memberDetails.status ?? '')}>
                    {memberDetails.status?.toUpperCase()}
                  </Tag>
                  <Tag color={getBillingStatusColor(memberDetails.billingStatus ?? '')}>
                    {memberDetails.billingStatus?.toUpperCase()}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Basic Information */}
          <Card title="Basic Information" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {memberDetails.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                {personalDetails?.phoneNumber || memberDetails.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> Date of Birth</>}>
{personalDetails?.dateOfBirth ? 
                  formatDisplayDate(personalDetails.dateOfBirth)
                  : (memberDetails.dob || 'N/A')
                }
              </Descriptions.Item>
              <Descriptions.Item label="Age">
                {personalDetails?.dateOfBirth ? 
                  Math.floor((new Date().getTime() - new Date(personalDetails.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : (memberDetails.age || 'N/A')
                }
              </Descriptions.Item>
              <Descriptions.Item label="Last Visit">
                {memberDetails.lastVisit || 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Membership Information */}
          <Card title="Membership Information" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Membership Type">
                {memberDetails.membership || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount (₹)">
                ₹{personalDetails?.totalAmount ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                N/A
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {memberDetails.expires
                  ? formatDisplayDate(memberDetails.expires as string)
                  : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Paid Amount (₹)">
                ₹{personalDetails?.paidAmount ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="Outstanding Amount (₹)">
                <Text 
                  style={{ 
                    color: ((personalDetails?.totalAmount ?? 0) - (personalDetails?.paidAmount ?? 0)) > 0 ? '#ff4d4f' : '#52c41a' 
                  }}
                >
                  ₹{((personalDetails?.totalAmount ?? 0) - (personalDetails?.paidAmount ?? 0))}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Personal Details */}
          {personalDetails && (
            <Card title="Personal Details" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label={
                  <Space>
                    {personalDetails.gender === 'male' ? <ManOutlined /> : 
                     personalDetails.gender === 'female' ? <WomanOutlined /> : <UserOutlined />}
                    Gender
                  </Space>
                }>
                  {personalDetails.gender || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label={<><HomeOutlined /> Address</>}>
                  {personalDetails.streetAddress ? 
                    `${personalDetails.streetAddress}, ${personalDetails.city}, ${personalDetails.state} ${personalDetails.zipcode}, ${personalDetails.country}` 
                    : 'N/A'
                  }
                </Descriptions.Item>
                {personalDetails.emergencyContacts && personalDetails.emergencyContacts.length > 0 && (
                  <Descriptions.Item label={<><ContactsOutlined /> Emergency Contacts</>} span={2}>
                    <div>
                      {personalDetails.emergencyContacts.map((contact, index) => (
                        <div key={index} style={{ marginBottom: 8 }}>
                          <Text strong>{contact.name}</Text> ({contact.relation})
                          <br />
                          <Text type="secondary">{contact.phone}</Text>
                        </div>
                      ))}
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {!personalDetails && (
            <Card style={{ marginTop: 16 }}>
              <Text type="secondary">
                No personal details available for this member.
              </Text>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
};

export default MemberDetailsModal;
