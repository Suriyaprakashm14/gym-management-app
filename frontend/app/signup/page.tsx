'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Typography, App, Row, Col, Upload, Card } from 'antd';
import { Building2, User, Mail, Lock, Dumbbell, Upload as UploadIcon } from 'lucide-react';
import { api } from '../utils/api';
import styles from './signup.module.css';

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

const labelStyle = { color: '#CBD5E1', fontSize: 13, fontWeight: 500 };
const prefixStyle = { color: '#64748B', width: 16, height: 16 };

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
      message.success('Account created! Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMsg = typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.outer}>
      <div className={styles.wrapper}>
      {/* Left: Branding (compact on mobile) */}
      <div className={styles.brandPanel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
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
        <Typography.Title level={2} className={styles.title} style={{ color: 'white', marginBottom: 12, fontWeight: 600, fontSize: 28, lineHeight: 1.3 }}>
          Start managing your gym
        </Typography.Title>
        <Typography.Paragraph className={styles.subtitle} style={{ color: 'rgba(148, 163, 184, 0.95)', fontSize: 15, lineHeight: 1.6, marginBottom: 28, maxWidth: 320 }}>
          Create your owner account and manage branches, members, and payments in one place.
        </Typography.Paragraph>
        <div className={styles.features} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

      {/* Right: Form */}
      <div className={styles.formPanel}>
        <Card className={styles.card}>
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4} style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: 20 }}>
              Create your account
            </Typography.Title>
            <Typography.Text style={{ color: 'rgba(148, 163, 184, 0.9)', fontSize: 13, marginTop: 4, display: 'block' }}>
              Takes about a minute — you’ll need your gym name and email.
            </Typography.Text>
          </div>

          <Form
            name="signup"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="large"
            style={{ marginBottom: 20 }}
          >
            <Form.Item
              label={<span style={labelStyle}>Gym name</span>}
              name="gymName"
              rules={[{ required: true, message: 'Please enter your gym name' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<Building2 style={prefixStyle} />}
                placeholder="e.g. Downtown Fitness"
                className={styles.inputHeight}
                style={{ height: 44 }}
              />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>Gym logo (optional)</span>}
              style={{ marginBottom: 16 }}
              help="Square image works best"
            >
              <div className={styles.uploadWrap}>
                <Upload
                  maxCount={1}
                  beforeUpload={(file) => { setIconFile(file); return false; }}
                  onRemove={() => setIconFile(null)}
                  accept="image/*"
                  listType="picture-card"
                  style={{ marginBottom: 0 }}
                >
                  <div style={{ padding: 8 }}>
                    <UploadIcon style={{ fontSize: 22, color: '#94A3B8', width: 22, height: 22 }} />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#94A3B8' }}>Upload</div>
                  </div>
                </Upload>
              </div>
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span style={labelStyle}>First name</span>}
                  name="firstName"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input prefix={<User style={prefixStyle} />} placeholder="First name" style={{ height: 44 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span style={labelStyle}>Last name</span>}
                  name="lastName"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input placeholder="Last name" style={{ height: 44 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label={<span style={labelStyle}>Email</span>}
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<Mail style={prefixStyle} />} placeholder="you@example.com" type="email" autoComplete="email" style={{ height: 44 }} />
            </Form.Item>
            <Form.Item
              label={<span style={labelStyle}>Password</span>}
              name="password"
              rules={[
                { required: true, message: 'Please choose a password' },
                { min: 6, message: 'Use at least 6 characters' },
              ]}
              style={{ marginBottom: 16 }}
              help="At least 6 characters"
            >
              <Input.Password
                prefix={<Lock style={prefixStyle} />}
                placeholder="Choose a password"
                autoComplete="new-password"
                style={{ height: 44 }}
              />
            </Form.Item>
            {errorMessage && (
              <div
                role="alert"
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
                className={styles.submitBtn}
                style={{ height: 48, fontWeight: 600, fontSize: 15, background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', border: 'none', borderRadius: 10 }}
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
    </div>
  );
}
