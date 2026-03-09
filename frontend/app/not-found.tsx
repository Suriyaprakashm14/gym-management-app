'use client';

import { Result, Button } from 'antd';
import { useRouter } from 'next/navigation';

export default function NotFound() {
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
      <Result
        status="403"
        title="Access Restricted"
        subTitle="You don’t have permission to access this page."
        extra={
          <Button type="primary" onClick={() => router.push('/dashboard')}>
            Go back to Dashboard
          </Button>
        }
      />
    </div>
  );
}

