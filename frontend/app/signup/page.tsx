'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Typography, App, Row, Col } from 'antd';
import { Building2, User, Mail, Lock, Dumbbell } from 'lucide-react';
import { api } from '../utils/api';

interface SignupFormValues {
  gymName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { message } = App.useApp();

  const onFinish = async (values: SignupFormValues) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await api.auth.signup({
        gymName: values.gymName.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      message.success('Account created successfully. Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMsg = typeof err?.message === 'string' ? err.message : 'Something went wrong';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        minHeight: 600,
        overflow: 'hidden',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Left: Branding */}
      <div
        style={{
          flex: '0 0 42%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '2rem 3rem',
          borderRight: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Dumbbell style={{ width: 26, height: 26, color: 'white' }} />
          </div>
          <Typography.Text style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>
            GymPro Manager
          </Typography.Text>
        </div>
        <Typography.Title level={2} style={{ color: 'white', marginBottom: 12, fontWeight: 600 }}>
          Start managing your gym
        </Typography.Title>
        <Typography.Paragraph
          style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.6, marginBottom: 24, maxWidth: 320 }}
        >
          Create your owner account and add branches, members, and payments in one place.
        </Typography.Paragraph>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 14 }}>
            <Building2 style={{ width: 18, height: 18, color: '#3B82F6' }} />
            <span>Multi-branch support</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 14 }}>
            <Lock style={{ width: 18, height: 18, color: '#10B981' }} />
            <span>Secure & role-based</span>
          </div>
        </div>
      </div>

      {/* Right: Form - no scroll, compact */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          overflow: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 28 }}>
            <Typography.Title level={3} style={{ margin: 0, color: 'white', fontWeight: 600 }}>
              Create account
            </Typography.Title>
            <Typography.Text style={{ color: '#94A3B8', fontSize: 14 }}>
              Gym owner registration
            </Typography.Text>
          </div>

          <Form
            name="signup"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="middle"
            style={{ marginBottom: 16 }}
          >
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13 }}>Gym name</span>}
              name="gymName"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input prefix={<Building2 style={{ color: '#64748B', width: 16, height: 16 }} />} placeholder="Your gym name" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#CBD5E1', fontSize: 13 }}>First name</span>}
                  name="firstName"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input prefix={<User style={{ color: '#64748B', width: 16, height: 16 }} />} placeholder="First name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#CBD5E1', fontSize: 13 }}>Last name</span>}
                  name="lastName"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="Last name" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13 }}>Email</span>}
              name="email"
              rules={[
                { required: true, message: 'Required' },
                { type: 'email', message: 'Invalid email' },
              ]}
            >
              <Input prefix={<Mail style={{ color: '#64748B', width: 16, height: 16 }} />} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13 }}>Password</span>}
              name="password"
              rules={[
                { required: true, message: 'Required' },
                { min: 6, message: 'Min 6 characters' },
              ]}
            >
              <Input.Password
                prefix={<Lock style={{ color: '#64748B', width: 16, height: 16 }} />}
                placeholder="At least 6 characters"
              />
            </Form.Item>
            {errorMessage && (
              <div
                style={{
                  color: '#f87171',
                  fontSize: 13,
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: 'rgba(248, 113, 113, 0.1)',
                  borderRadius: 6,
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                }}
              >
                {errorMessage}
              </div>
            )}
            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                style={{
                  height: 44,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  border: 'none',
                }}
              >
                Create account
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Typography.Text style={{ color: '#94A3B8', fontSize: 14 }}>
              Already have an account?{' '}
            </Typography.Text>
            <Link
              href="/login"
              style={{ color: '#60A5FA', fontWeight: 500, textDecoration: 'none' }}
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
