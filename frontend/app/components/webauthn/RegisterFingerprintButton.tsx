'use client';

import React, { useState } from 'react';
import { Button, App } from 'antd';
import { Fingerprint } from 'lucide-react';
import { useWebAuthn } from '../../hooks/useWebAuthn';

export default function RegisterFingerprintButton() {
  const { message } = App.useApp();
  const { startRegistration } = useWebAuthn();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await startRegistration();
      if (!res?.success) {
        message.error(res?.message || 'Fingerprint registration failed.');
        return;
      }
      message.success('Fingerprint registered successfully!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={onClick}
      loading={loading}
      icon={<Fingerprint className="w-4 h-4" />}
      className="!rounded-xl"
    >
      Register Fingerprint
    </Button>
  );
}

