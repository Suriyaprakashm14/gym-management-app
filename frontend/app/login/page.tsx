'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Typography, App } from 'antd';
import { Mail, Lock } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { setTokenCookie } from '../utils/authCookie';
import { AuthShell } from '../components/auth/AuthShell';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { message } = App.useApp();
  const signedUp = searchParams.get('signedup') === '1';
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.auth.login(values);
      if (!response || response.aborted) {
        return;
      }
      if (!response?.success) {
        const msg = response?.message || 'Invalid credentials';
        setErrorMessage(msg);
        message.error(msg);
        return;
      }
      if (!response?.token || !response?.user) {
        message.error('Account is deactivated. Contact your owner.');
        return;
      }
      login(response.token, response.user);
      setTokenCookie(response.token);
      message.success('Login successful!');
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    const emailValue = form.getFieldValue('email')?.trim?.() || '';
    const url = emailValue ? `/forgot-password?email=${encodeURIComponent(emailValue)}` : '/forgot-password';
    router.push(url);
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Log in to your FitForge admin dashboard."
      footer={
        <div className="text-center">
          <Typography.Text className="!text-muted-foreground">
            Don&apos;t have an account?{' '}
          </Typography.Text>
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </div>
      }
    >
      <Form form={form} name="login" layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        {signedUp && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-sm border border-accent/30 bg-accent/10 text-foreground"
            role="status"
          >
            Account created. Please log in.
          </div>
        )}

        <Form.Item
          label={<span className="text-sm text-muted-foreground">Email</span>}
          name="email"
          rules={[
            { required: true, message: 'Please enter your email!' },
            { type: 'email', message: 'Enter a valid email address' },
          ]}
        >
          <Input
            placeholder="you@company.com"
            autoComplete="email"
            prefix={<Mail className="w-4 h-4 text-muted-foreground" />}
            className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm text-muted-foreground">Password</span>}
          name="password"
          rules={[{ required: true, message: 'Please enter your password!' }]}
        >
          <Input.Password
            placeholder="Enter your password"
            autoComplete="current-password"
            prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
            className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
          />
        </Form.Item>

        {errorMessage && (
          <div className="mb-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="ff-auth-link text-sm text-primary hover:underline font-medium"
          >
            Forgot Password?
          </button>
          <div className="text-xs text-muted-foreground">Secure sign in</div>
        </div>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95"
          >
            Login
          </Button>
        </Form.Item>
      </Form>
    </AuthShell>
  );
}
