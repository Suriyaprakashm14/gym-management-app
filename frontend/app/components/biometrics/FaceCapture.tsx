'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Spin } from 'antd';
import { CameraOutlined } from '@ant-design/icons';

interface FaceCaptureProps {
  visible: boolean;
  onCancel: () => void;
  onCapture: (blob: Blob) => void;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ visible, onCancel, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      if (!visible || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return;
      }
      setInitializing(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        // Camera permission denied or not available
        // Let parent handle by closing or showing error
      } finally {
        setInitializing(false);
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (visible) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [visible]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Modal
      title="Face Capture"
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={handleCapture}
            disabled={initializing}
          >
            Capture Face
          </Button>
        </div>
      }
      width={480}
      destroyOnHidden
    >
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
        {initializing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 2,
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Spin />
            <span style={{ color: '#fff', fontSize: 12 }}>Initializing camera...</span>
          </div>
        )}
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          autoPlay
          muted
        />
        {/* Scanning overlay */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '15%',
            width: '70%',
            height: '60%',
            border: '2px solid rgba(82,196,26,0.9)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
            borderRadius: 12,
            pointerEvents: 'none',
          }}
        />
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Modal>
  );
};

export default FaceCapture;

