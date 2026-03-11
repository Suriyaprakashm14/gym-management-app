'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Card, Typography, App } from 'antd';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { setTokenCookie } from '../utils/authCookie';

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

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await api.auth.login(values);
      if (!data?.token) {
        message.error('Account is deactivated. Contact your owner.');
        return;
      }
      login(data.token, data.user);
      setTokenCookie(data.token);
      message.success('Login successful!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMsg =
        (error instanceof Error && error.message?.trim()) || 'Something went wrong. Please try again.';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    router.push('/forgot-password');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            Login
          </Title>
        </div>
        <Form name="login" layout="vertical" onFinish={onFinish}>
          {signedUp && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, color: '#52c41a', fontSize: 13 }}>
              Account created. Please log in.
            </div>
          )}
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please enter your email!' }]}>
            <Input placeholder="Enter your email" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please enter your password!' }]}>
            <Input.Password placeholder="Enter your password" />
          </Form.Item>
          {errorMessage && (
            <div style={{ color: '#ff4d4f', fontSize: 14, marginBottom: 8, textAlign: 'left' }}>{errorMessage}</div>
          )}
          <div style={{ textAlign: 'left' }}>
            <Button type="link" style={{ padding: 0 }} onClick={handleForgotPasswordClick}>
              Forgot Password?
            </Button>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Login
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text type="secondary">Don&apos;t have an account? </Typography.Text>
            <Link href="/signup">Sign up</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
