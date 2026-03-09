'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Card, Col, Input, Result, Row, Space, Typography } from 'antd';
import { VideoCameraOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { api } from '../utils/api';

const { Title, Text } = Typography;

type StatusState = 'idle' | 'processing' | 'success' | 'failed';

const BiometricTestPage: React.FC = () => {
  const { message } = App.useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [memberId, setMemberId] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState<StatusState>('idle');
  const [isAutoCapture, setIsAutoCapture] = useState(false);

  const stopCamera = useCallback(() => {
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (isCameraActive) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      message.error('Camera API not available in this environment.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setStatus('idle');
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      message.error('Failed to access camera. Please check permissions.');
      setIsCameraActive(false);
    }
  }, [isCameraActive, message]);

  const captureAndVerify = useCallback(async () => {
    if (!memberId.trim()) {
      message.warning('Enter a member ID to verify.');
      return;
    }
    if (!videoRef.current) {
      message.warning('Start the camera before capturing.');
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      message.warning('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    try {
      setStatus('processing');

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to get 2D context from canvas');
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );
      if (!blob) {
        throw new Error('Failed to capture frame as image');
      }

      // Convert blob -> File so we can reuse existing api.attendance.markWithFace()
      const file = new File([blob], 'face-checkin.jpg', { type: 'image/jpeg' });

      console.log('Sending face frame to /api/attendance for memberId:', memberId);
      const response = await api.attendance.markWithFace(memberId.trim(), file as File);
      console.log('Face verification response:', response);

      const success =
        (response as any)?.success === true ||
        ((response as any)?.message || '').toLowerCase().includes('attendance marked');

      if (success) {
        setStatus('success');
        message.success('Face recognized and attendance marked.');
      } else {
        setStatus('failed');
        const errMsg =
          (response as any)?.error ||
          (response as any)?.message ||
          'Face not recognized or attendance could not be marked.';
        message.error(errMsg);
      }
    } catch (err: any) {
      console.error('Face verification failed:', err);
      setStatus('failed');
      message.error(err?.message || 'Face verification failed.');
    }
  }, [memberId, message]);

  // Optional auto capture every 3 seconds while enabled and camera active
  useEffect(() => {
    if (isAutoCapture && isCameraActive) {
      if (!autoCaptureTimerRef.current) {
        autoCaptureTimerRef.current = setInterval(() => {
          captureAndVerify().catch(() => {
            // Errors are already handled in captureAndVerify
          });
        }, 3000);
      }
    } else if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
    return () => {
      if (autoCaptureTimerRef.current) {
        clearInterval(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
    };
  }, [isAutoCapture, isCameraActive, captureAndVerify]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const renderStatusResult = () => {
    if (status === 'success') {
      return (
        <Result
          status="success"
          title="Face Recognized"
          subTitle="Attendance was marked successfully using face recognition."
        />
      );
    }
    if (status === 'failed') {
      return (
        <Result
          status="error"
          title="Face Not Recognized"
          subTitle="The captured face did not match the enrolled personId or attendance could not be created."
        />
      );
    }
    if (status === 'processing') {
      return (
        <Result
          icon={<VideoCameraOutlined />}
          title="Processing..."
          subTitle="Sending frame to the backend and waiting for Luxand response."
        />
      );
    }
    return (
      <Result
        icon={<CheckCircleOutlined />}
        title="Idle"
        subTitle="Start the camera, enter a member ID, then capture & verify."
      />
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 8 }}>
        Face Recognition Test
      </Title>
      <Text type="secondary">
        Use your webcam to capture a face and verify it against the Luxand database via the attendance
        API.
      </Text>

      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col xs={24} md={14}>
          <Card title="Camera" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Input
                placeholder="Enter member ID (e.g. 06d74a45-0de8-4daa-b44b-3fb610a915e9)"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              />

              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%',
                  background: '#000',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              <Space>
                <Button
                  type={isCameraActive ? 'default' : 'primary'}
                  icon={<VideoCameraOutlined />}
                  onClick={isCameraActive ? stopCamera : startCamera}
                >
                  {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                </Button>
                <Button
                  type="primary"
                  onClick={captureAndVerify}
                  disabled={!isCameraActive}
                  loading={status === 'processing'}
                >
                  Capture &amp; Verify Face
                </Button>
                <Button
                  onClick={() => setIsAutoCapture((prev) => !prev)}
                  disabled={!isCameraActive}
                >
                  {isAutoCapture ? 'Stop Auto Capture' : 'Start Auto Capture (3s)'}
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card title="Status" bordered={false}>
            {renderStatusResult()}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BiometricTestPage;

