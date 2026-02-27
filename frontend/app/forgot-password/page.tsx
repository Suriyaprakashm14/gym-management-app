'use client';

import { Button, Card, Typography } from 'antd';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 16,
      }}
    >
      <Card style={{ maxWidth: 520, width: '100%' }}>
        <Title level={3}>Forgot Password</Title>
        <Paragraph>
          Password reset is managed by admin and manager accounts in this system.
          Please contact your gym administrator if you need access help.
        </Paragraph>
        <Button type="primary" onClick={() => router.push('/login')}>
          Back to Login
        </Button>
      </Card>
    </div>
  );
}
