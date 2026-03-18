'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Steps, Typography, App } from 'antd';
import { Mail, KeyRound, Lock } from 'lucide-react';
import { api } from '../utils/api';
import { AuthShell } from '../components/auth/AuthShell';

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
    <AuthShell
      title="Forgot Password"
      subtitle="Reset your owner account password in a few quick steps."
      bullets={[
        'Secure OTP verification',
        'Fast password reset',
        'Back to dashboard in minutes',
      ]}
      footer={
        <div className="text-center">
          <Link href="/login" className="ff-auth-link text-primary hover:underline font-medium">
            Back to Login
          </Link>
        </div>
      }
    >
      <div className="text-center mb-6">
        <Title level={5} className="!mb-1 !text-foreground !font-display">
          {step === 1 ? 'Enter your email' : step === 2 ? 'Verify OTP' : 'Set a new password'}
        </Title>
        <Text className="!text-muted-foreground text-sm">
          {step === 1
            ? 'We’ll send a 6-digit code to your email.'
            : step === 2
              ? `We sent a code to ${email || 'your email'}.`
              : 'Choose a strong password you don’t use elsewhere.'}
        </Text>
      </div>

      <Steps current={step - 1} size="small" className="!mb-6">
        {steps.map((s, i) => (
          <Steps.Step key={i} title={s.title} />
        ))}
      </Steps>

      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm border border-destructive/30 bg-destructive/10 text-foreground" role="alert">
          {error}
        </div>
      )}

      {step === 1 && (
        <Form form={form1} layout="vertical" onFinish={handleStep1} requiredMark={false} size="large">
          <Form.Item
            name="email"
            label={<span className="text-sm text-muted-foreground">Email</span>}
            rules={[
              { required: true, message: 'Enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              placeholder="you@company.com"
              type="email"
              autoComplete="email"
              prefix={<Mail className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95">
              Send OTP
            </Button>
          </Form.Item>
        </Form>
      )}

      {step === 2 && (
        <Form form={form2} layout="vertical" onFinish={handleStep2} requiredMark={false} size="large">
          <Form.Item
            name="otp"
            label={<span className="text-sm text-muted-foreground">OTP</span>}
            rules={[
              { required: true, message: 'Enter the OTP from your email' },
              { len: 6, message: 'OTP is 6 digits' },
            ]}
          >
            <Input
              placeholder="6-digit code"
              maxLength={6}
              inputMode="numeric"
              prefix={<KeyRound className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" block loading={loading} className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95">
              Verify OTP
            </Button>
          </Form.Item>
          <Button type="link" block onClick={handleResendOtp} disabled={loading} className="!h-10">
            Resend OTP
          </Button>
        </Form>
      )}

      {step === 3 && (
        <Form form={form3} layout="vertical" onFinish={handleStep3} requiredMark={false} size="large">
          <Form.Item
            name="newPassword"
            label={<span className="text-sm text-muted-foreground">New Password</span>}
            rules={[
              { required: true, message: 'Enter new password' },
              { min: 6, message: 'At least 6 characters' },
            ]}
          >
            <Input.Password
              placeholder="New password"
              autoComplete="new-password"
              prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={<span className="text-sm text-muted-foreground">Confirm Password</span>}
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
            <Input.Password
              placeholder="Confirm password"
              autoComplete="new-password"
              prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95">
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      )}
    </AuthShell>
  );
}
