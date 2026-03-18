'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Form, Input, Steps, Typography, App } from 'antd';
import { api } from '../utils/api';

const { Title, Text } = Typography;

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [form1] = Form.useForm();
  const [form2] = Form.useForm();
  const [form3] = Form.useForm();

  const emailFromUrl = searchParams.get('email')?.trim() || '';
  useEffect(() => {
    if (emailFromUrl) {
      form1.setFieldsValue({ email: emailFromUrl });
    }
  }, [emailFromUrl]);

  const handleStep1 = async () => {
    setError('');
    try {
      const values = await form1.validateFields();
      const e = (values.email as string).toLowerCase().trim();
      setLoading(true);
      const res = await api.auth.forgotPassword(e);
      const data = res as { success?: boolean; error?: string; message?: string };
      if (data?.success) {
        setEmail(e);
        setStep(2);
        message.success('OTP sent to your email');
      } else {
        setError((data?.error as string) || data?.message || 'Failed to send OTP');
      }
    } catch (err: unknown) {
      if ((err as { errorFields?: unknown[] })?.errorFields) return;
      const msg = (err as Error)?.message || 'Failed to send OTP';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    setError('');
    try {
      const values = await form2.validateFields();
      const otpVal = String(values.otp).trim();
      setLoading(true);
      const res = await api.auth.verifyOtp(email, otpVal);
      const data = res as { success?: boolean; error?: string; message?: string };
      if (data?.success) {
        setOtp(otpVal);
        setStep(3);
        message.success('OTP verified');
      } else {
        setError((data?.error as string) || data?.message || 'Invalid or expired OTP');
      }
    } catch (err: unknown) {
      if ((err as { errorFields?: unknown[] })?.errorFields) return;
      const msg = (err as Error)?.message || 'Verification failed';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setError('');
    try {
      const values = await form3.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        setError('Passwords do not match');
        message.error('Passwords do not match');
        return;
      }
      setLoading(true);
      const res = await api.auth.resetPassword(email, otp, values.newPassword);
      const data = res as { success?: boolean; error?: string; message?: string };
      if (data?.success) {
        message.success('Password updated successfully');
        router.replace('/login');
        return;
      }
      setError((data?.error as string) || data?.message || 'Failed to reset password');
    } catch (err: unknown) {
      if ((err as { errorFields?: unknown[] })?.errorFields) return;
      const msg = (err as Error)?.message || 'Failed to reset password';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      setLoading(true);
      const res = await api.auth.resendOtp(email);
      const data = res as { success?: boolean; error?: string; message?: string };
      if (data?.success) {
        message.success('New OTP sent to your email');
      } else {
        setError((data?.error as string) || data?.message || 'Failed to resend OTP');
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to resend OTP';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Enter email', content: null },
    { title: 'Verify OTP', content: null },
    { title: 'New password', content: null },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: 440, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            Forgot Password
          </Title>
          <Text type="secondary">Reset your owner account password</Text>
        </div>

        <Steps current={step - 1} size="small" style={{ marginBottom: 24 }}>
          {steps.map((s, i) => (
            <Steps.Step key={i} title={s.title} />
          ))}
        </Steps>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '8px 12px',
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 6,
              color: '#cf1322',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <Form form={form1} layout="vertical" onFinish={handleStep1}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Enter your email' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input placeholder="Owner email" type="email" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Send OTP
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 2 && (
          <Form form={form2} layout="vertical" onFinish={handleStep2}>
            <Form.Item
              name="otp"
              label="OTP"
              rules={[
                { required: true, message: 'Enter the OTP from your email' },
                { len: 6, message: 'OTP is 6 digits' },
              ]}
            >
              <Input placeholder="6-digit OTP" maxLength={6} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Verify OTP
              </Button>
            </Form.Item>
            <Button type="link" block onClick={handleResendOtp} disabled={loading}>
              Resend OTP
            </Button>
          </Form>
        )}

        {step === 3 && (
          <Form form={form3} layout="vertical" onFinish={handleStep3}>
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Enter new password' },
                { min: 6, message: 'At least 6 characters' },
              ]}
            >
              <Input.Password placeholder="New password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Reset Password
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/login">Back to Login</Link>
        </div>
      </Card>
    </div>
  );
}
