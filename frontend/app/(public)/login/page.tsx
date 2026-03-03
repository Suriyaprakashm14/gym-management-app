'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, Card, Typography, App } from 'antd';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { setTokenCookie } from '../../utils/authCookie';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const { message } = App.useApp();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await api.auth.login(values);
      login(data.token, data.user);
      setTokenCookie(data.token);
      message.success('Login successful!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
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
        </Form>
      </Card>
    </div>
  );
}
