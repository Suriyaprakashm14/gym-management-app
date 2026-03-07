'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Typography, App, Row, Col, Upload, Card } from 'antd';
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
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Left: Branding */}
      <div
        style={{
          flex: '0 0 42%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 56px',
          borderRight: '1px solid rgba(148, 163, 184, 0.12)',
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
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            <Dumbbell style={{ width: 26, height: 26, color: 'white' }} />
          </div>
          <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
            GymPro Manager
          </Typography.Text>
        </div>
        <Typography.Title level={2} style={{ color: 'white', marginBottom: 12, fontWeight: 600, fontSize: 28, lineHeight: 1.3 }}>
          Start managing your gym
        </Typography.Title>
        <Typography.Paragraph
          style={{ color: 'rgba(148, 163, 184, 0.95)', fontSize: 15, lineHeight: 1.6, marginBottom: 28, maxWidth: 320 }}
        >
          Create your owner account and manage branches, members, and payments in one place.
        </Typography.Paragraph>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(148, 163, 184, 0.9)', fontSize: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 style={{ width: 18, height: 18, color: '#60A5FA' }} />
            </div>
            <span>Multi-branch support</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(148, 163, 184, 0.9)', fontSize: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock style={{ width: 18, height: 18, color: '#34D399' }} />
            </div>
            <span>Secure & role-based access</span>
          </div>
        </div>
      </div>

      {/* Right: Form in card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          minHeight: '100vh',
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 16,
            boxShadow: '0 24px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(12px)',
          }}
          styles={{ body: { padding: '32px 28px' } }}
        >
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4} style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: 20 }}>
              Create account
            </Typography.Title>
            <Typography.Text style={{ color: 'rgba(148, 163, 184, 0.9)', fontSize: 13, marginTop: 4, display: 'block' }}>
              Gym owner registration
            </Typography.Text>
          </div>

          <Form
            name="signup"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="middle"
            style={{ marginBottom: 20 }}
          >
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 500 }}>Gym name</span>}
              name="gymName"
              rules={[{ required: true, message: 'Required' }]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<Building2 style={{ color: '#64748B', width: 16, height: 16 }} />} placeholder="Your gym name" style={{ height: 40 }} />
            </Form.Item>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 500 }}>Gym icon (optional)</span>}
              style={{ marginBottom: 16 }}
            >
              <Upload
                maxCount={1}
                beforeUpload={(file) => { setIconFile(file); return false; }}
                onRemove={() => setIconFile(null)}
                accept="image/*"
                listType="picture-card"
                className="signup-upload"
                style={{ marginBottom: 0 }}
              >
                <div style={{ padding: 8 }}>
                  <UploadIcon style={{ fontSize: 22, color: '#94A3B8', width: 22, height: 22 }} />
                  <div style={{ marginTop: 4, fontSize: 12, color: '#94A3B8' }}>Upload</div>
                </div>
              </Upload>
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 500 }}>First name</span>}
                  name="firstName"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input prefix={<User style={{ color: '#64748B', width: 16, height: 16 }} />} placeholder="First" style={{ height: 40 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 500 }}>Last name</span>}
                  name="lastName"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input placeholder="Last" style={{ height: 40 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 500 }}>Email</span>}
              name="email"
              rules={[{ required: true, message: 'Required' }, { type: 'email', message: 'Invalid email' }]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<Mail style={{ color: '#64748B', width: 16, height: 16 }} />} placeholder="you@example.com" style={{ height: 40 }} />
            </Form.Item>
            <Form.Item
              label={<span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 500 }}>Password</span>}
              name="password"
              rules={[{ required: true, message: 'Required' }, { min: 6, message: 'Min 6 characters' }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                prefix={<Lock style={{ color: '#64748B', width: 16, height: 16 }} />}
                placeholder="Min 6 characters"
                style={{ height: 40 }}
              />
            </Form.Item>
            {errorMessage && (
              <div
                style={{
                  color: '#f87171',
                  fontSize: 13,
                  marginBottom: 12,
                  padding: '10px 12px',
                  background: 'rgba(248, 113, 113, 0.12)',
                  borderRadius: 8,
                  border: '1px solid rgba(248, 113, 113, 0.25)',
                }}
              >
                {errorMessage}
              </div>
            )}
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                style={{ height: 44, fontWeight: 600, fontSize: 15, background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', border: 'none', borderRadius: 10 }}
              >
                Create account
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingTop: 20, borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <Typography.Text style={{ color: 'rgba(148, 163, 184, 0.9)', fontSize: 14 }}>
              Already have an account?{' '}
            </Typography.Text>
            <Link href="/login" style={{ color: '#60A5FA', fontWeight: 600, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
