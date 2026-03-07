'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Typography, App, Row, Col, Upload } from 'antd';
import { Building2, User, Mail, Lock, Dumbbell, Upload as UploadIcon } from 'lucide-react';
import { api } from '../utils/api';

interface SignupFormValues {
  gymName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const router = useRouter();
  const { message } = App.useApp();

  const onFinish = async (values: SignupFormValues) => {
    setLoading(true);
    setErrorMessage('');
    try {
      let gymIcon: string | undefined;
      if (iconFile) {
        gymIcon = await fileToDataUrl(iconFile);
      }
      await api.auth.signup({
        gymName: values.gymName.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        ...(gymIcon ? { gymIcon } : {}),
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
        minHeight: 560,
        overflow: 'hidden',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Left: Branding - compact */}
      <div
        style={{
          flex: '0 0 38%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '1.25rem 2rem',
          borderRight: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Dumbbell style={{ width: 22, height: 22, color: 'white' }} />
          </div>
          <Typography.Text style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
            GymPro Manager
          </Typography.Text>
        </div>
        <Typography.Title level={3} style={{ color: 'white', marginBottom: 8, fontWeight: 600 }}>
          Start managing your gym
        </Typography.Title>
        <Typography.Paragraph
          style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.5, marginBottom: 16, maxWidth: 280 }}
        >
          Create your owner account and add branches, members, and payments in one place.
        </Typography.Paragraph>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12 }}>
            <Building2 style={{ width: 16, height: 16, color: '#3B82F6' }} />
            <span>Multi-branch support</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12 }}>
            <Lock style={{ width: 16, height: 16, color: '#10B981' }} />
            <span>Secure & role-based</span>
          </div>
        </div>
      </div>

      {/* Right: Form - no scroll, compact, fit in viewport */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 20px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 16 }}>
            <Typography.Title level={4} style={{ margin: 0, color: 'white', fontWeight: 600 }}>
              Create account
            </Typography.Title>
            <Typography.Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Gym owner registration
            </Typography.Text>
          </div>

          <Form
            name="signup"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="small"
            style={{ marginBottom: 12 }}
          >
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 12 }}>Gym name</span>}
              name="gymName"
              rules={[{ required: true, message: 'Required' }]}
              style={{ marginBottom: 12 }}
            >
              <Input prefix={<Building2 style={{ color: '#64748B', width: 14, height: 14 }} />} placeholder="Your gym name" />
            </Form.Item>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 12 }}>Gym icon (optional)</span>}
              style={{ marginBottom: 12 }}
            >
              <Upload
                maxCount={1}
                beforeUpload={(file) => { setIconFile(file); return false; }}
                onRemove={() => setIconFile(null)}
                accept="image/*"
                listType="picture-card"
                style={{ marginBottom: 0 }}
              >
                <div style={{ padding: 4 }}>
                  <UploadIcon style={{ fontSize: 20, color: '#94A3B8', width: 20, height: 20 }} />
                  <div style={{ marginTop: 2, fontSize: 11, color: '#94A3B8' }}>Upload</div>
                </div>
              </Upload>
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#CBD5E1', fontSize: 12 }}>First name</span>}
                  name="firstName"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input prefix={<User style={{ color: '#64748B', width: 14, height: 14 }} />} placeholder="First" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#CBD5E1', fontSize: 12 }}>Last name</span>}
                  name="lastName"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Last" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 12 }}>Email</span>}
              name="email"
              rules={[{ required: true, message: 'Required' }, { type: 'email', message: 'Invalid email' }]}
              style={{ marginBottom: 12 }}
            >
              <Input prefix={<Mail style={{ color: '#64748B', width: 14, height: 14 }} />} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 12 }}>Password</span>}
              name="password"
              rules={[{ required: true, message: 'Required' }, { min: 6, message: 'Min 6 characters' }]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password
                prefix={<Lock style={{ color: '#64748B', width: 14, height: 14 }} />}
                placeholder="Min 6 characters"
              />
            </Form.Item>
            {errorMessage && (
              <div
                style={{
                  color: '#f87171',
                  fontSize: 12,
                  marginBottom: 8,
                  padding: '6px 10px',
                  background: 'rgba(248, 113, 113, 0.1)',
                  borderRadius: 6,
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                }}
              >
                {errorMessage}
              </div>
            )}
            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="middle"
                style={{ height: 38, fontWeight: 600, background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', border: 'none' }}
              >
                Create account
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Typography.Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Already have an account?{' '}
            </Typography.Text>
            <Link href="/login" style={{ color: '#60A5FA', fontWeight: 500, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
