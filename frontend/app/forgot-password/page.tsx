'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Steps, Typography, App } from 'antd';
import { Smartphone, KeyRound, Lock } from 'lucide-react';
import { api } from '../utils/api';
import { AuthShell } from '../components/auth/AuthShell';

const { Title, Text } = Typography;

type Step = 1 | 2 | 3;

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function normalizePhoneDigits(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1);
  const [otpRecipientEmail, setOtpRecipientEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotResendPayload, setForgotResendPayload] = useState<{ email?: string; phone?: string }>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [form1] = Form.useForm();
  const [form2] = Form.useForm();
  const [form3] = Form.useForm();

  const emailFromUrl = searchParams.get('email')?.trim() || '';
  const phoneFromUrl = searchParams.get('phone')?.trim() || '';

  useEffect(() => {
    if (phoneFromUrl && INDIAN_MOBILE.test(phoneFromUrl)) {
      form1.setFieldsValue({ mobileOrEmail: phoneFromUrl });
    } else if (emailFromUrl) {
      form1.setFieldsValue({ mobileOrEmail: emailFromUrl });
    }
  }, [emailFromUrl, phoneFromUrl, form1]);

  const handleStep1 = async () => {
    setError('');
    try {
      const values = await form1.validateFields();
      const raw = String(values.mobileOrEmail || '').trim();
      let payload: { email?: string; phone?: string };
      if (raw.includes('@')) {
        payload = { email: raw.toLowerCase() };
      } else {
        const local = normalizePhoneDigits(raw);
        if (!INDIAN_MOBILE.test(local)) {
          message.error('Enter a valid Indian mobile or recovery email');
          return;
        }
        payload = { phone: local };
      }

      setLoading(true);
      const res = (await api.auth.forgotPassword(payload)) as {
        email?: string;
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (res && typeof res === 'object' && res.email) {
        setForgotResendPayload(payload);
        setOtpRecipientEmail(res.email);
        setStep(2);
        message.success('OTP sent to your recovery email');
      } else {
        setError(
          (typeof res?.error === 'string' && res.error) ||
            (typeof res?.message === 'string' && res.message) ||
            'Failed to send OTP'
        );
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
      const res = (await api.auth.verifyOtp(otpRecipientEmail, otpVal, 'password_reset')) as {
        success?: boolean;
        error?: string;
        message?: string;
        token?: string;
      };
      if (res?.token) {
        setOtp(otpVal);
        setStep(3);
        message.success('OTP verified');
      } else {
        setError((res?.error as string) || res?.message || 'Invalid or expired OTP');
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
      const res = (await api.auth.resetPassword(otpRecipientEmail, otp, values.newPassword)) as {
        success?: boolean;
        error?: string;
        message?: string;
        resetAt?: string;
        email?: string;
      };
      if (res?.resetAt || res?.email) {
        message.success('Password updated successfully');
        router.replace('/login');
        return;
      }
      setError((res?.error as string) || res?.message || 'Failed to reset password');
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
      const res = (await api.auth.resendOtp(forgotResendPayload)) as {
        success?: boolean;
        error?: string;
        message?: string;
        email?: string;
        expiresIn?: string;
      };
      if (res && (res.email || res.expiresIn)) {
        message.success('New OTP sent to your email');
      } else {
        setError((res?.error as string) || res?.message || 'Failed to resend OTP');
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
    { title: 'Identify account', content: null },
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
          {step === 1
            ? 'Mobile or recovery email'
            : step === 2
              ? 'Verify OTP'
              : 'Set a new password'}
        </Title>
        <Text className="!text-muted-foreground text-sm">
          {step === 1
            ? 'Use the Indian mobile you signed up with, or your recovery email. OTP is always sent to your recovery email.'
            : step === 2
              ? `We sent a code to ${otpRecipientEmail ? `${otpRecipientEmail.slice(0, 2)}•••@${otpRecipientEmail.split('@')[1] || '…'}` : 'your email'}.`
              : 'Choose a strong password you don’t use elsewhere.'}
        </Text>
      </div>

      <Steps current={step - 1} size="small" className="!mb-6">
        {steps.map((s, i) => (
          <Steps.Step key={i} title={s.title} />
        ))}
      </Steps>

      {error && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-sm border border-destructive/30 bg-destructive/10 text-foreground"
          role="alert"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <Form form={form1} layout="vertical" onFinish={handleStep1} requiredMark={false} size="large">
          <Form.Item
            name="mobileOrEmail"
            label={<span className="text-sm text-muted-foreground">Mobile (India) or recovery email</span>}
            rules={[{ required: true, message: 'Enter your mobile number or recovery email' }]}
          >
            <Input
              placeholder="9876543210 or owner@example.com"
              autoComplete="username"
              prefix={<Smartphone className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95"
            >
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
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95"
            >
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
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95"
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      )}
    </AuthShell>
  );
}
