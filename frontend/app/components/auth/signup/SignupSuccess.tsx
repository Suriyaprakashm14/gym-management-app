'use client';

import { useRouter } from 'next/navigation';
import { Result, Button } from 'antd';

interface SignupSuccessProps {
  onLogin?: () => void;
}

export function SignupSuccess({ onLogin }: SignupSuccessProps) {
  const router = useRouter();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      router.push('/login');
    }
  };

  return (
    <Result
      status="success"
      title={<>🎉 Account Created Successfully!</>}
      subTitle="Your account has been created successfully. You can now log in and start managing your gym."
      extra={[
        <Button type="primary" key="login" size="large" onClick={handleLogin}>
          Login
        </Button>,
      ]}
    />
  );
}
