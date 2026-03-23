// app/components/biometrics/FingerprintCapture.tsx
'use client';

import React, { useState } from 'react';
import { Modal, Button, Spin } from 'antd';
import { Fingerprint, CheckCircle } from 'lucide-react';

interface FingerprintCaptureProps {
  visible: boolean;
  onCancel: () => void;
  onCapture: () => void;
}

const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  visible,
  onCancel,
  onCapture,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    setScanning(true);
    
    // Simulate scanning for 2 seconds
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      
      // Auto close after success
      setTimeout(() => {
        onCapture();
        setScanned(false);
      }, 1000);
    }, 2000);
  };

  return (
    <Modal
      title="Fingerprint Registration"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      centered
      destroyOnHidden
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {!scanning && !scanned && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Fingerprint className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Scan Fingerprint</h3>
            <p className="text-gray-500 mb-6">Place your finger on the scanner</p>
            <Button 
              type="primary" 
              size="large" 
              block 
              onClick={handleScan}
              icon={<Fingerprint className="w-4 h-4" />}
            >
              Start Scan
            </Button>
          </>
        )}

        {scanning && (
          <>
            <Spin size="large" />
            <div className="mt-4">
              <Fingerprint className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-pulse" />
              <p className="font-medium">Scanning fingerprint...</p>
              <p className="text-sm text-gray-500 mt-2">Please hold your finger steady</p>
            </div>
          </>
        )}

        {scanned && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-green-600">Fingerprint Added!</h3>
          </>
        )}
      </div>
    </Modal>
  );
};

export default FingerprintCapture;