'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, message, Card, Typography } from 'antd';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import loginImage from '../../asset/login_Img.jpg';

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

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMessage(''); // Clear previous error
    try {
      const data = await api.auth.login(values);

      // Use AuthContext to store user data
      login(data.token, data.user);
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
  // ✅ Forgot password navigation
  const handleForgotPasswordClick = () => {
    router.push('/forgot-password');
  };

  return (
     <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${loginImage.src})`,
     
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card
      style={{
          width: 400}}
        // bordered={false}
        // style={{
        //   width: 400,
        //   background: 'rgba(255, 255, 255, 0.9)',
        //   boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        //   borderRadius: 12,
        // }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24}}>
          <Title level={3} style={{ marginBottom: 0 }}>
            Login
          </Title>
        </div>
        <Form name="login" layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please enter your email!' }]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password!' }]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>
          
          {errorMessage && (
            <div style={{ 
              color: '#ff4d4f', 
              fontSize: '14px', 
              marginBottom: '8px',
              textAlign: 'left'
            }}>
              {errorMessage}
            </div>
          )}
          
          <div style={{ textAlign: 'left' }}>
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={handleForgotPasswordClick}
            >
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
