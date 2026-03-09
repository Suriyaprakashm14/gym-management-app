'use client';

/**
 * faceCheckinTest.ts
 *
 * Utility to:
 * 1) Capture a single frame from the user's webcam.
 * 2) Send it to the backend attendance API as a face-based check-in.
 *
 * Usage (for quick manual testing in the browser console):
 *
 *   import { captureAndCheckin } from '../utils/faceCheckinTest';
 *   await captureAndCheckin('<memberId-from-db>');
 *
 * This will:
 *  - Ask for camera permission
 *  - Show a temporary full-screen overlay with the live video
 *  - Capture one frame and send it via the existing attendance API helper
 *  - Log the result to the console
 */

/* eslint-disable no-console */

import { api } from './api';

export async function captureAndCheckin(memberId: string): Promise<void> {
  if (!memberId) {
    console.error('captureAndCheckin: memberId is required');
    return;
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.error('captureAndCheckin: navigator.mediaDevices.getUserMedia is not available');
    return;
  }

  console.log('===== FACE CHECK-IN TEST (browser) =====');
  console.log('Member ID:', memberId);

  // Create overlay for video preview
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.8)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.flexDirection = 'column';
  overlay.style.gap = '16px';

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.style.width = '480px';
  video.style.maxWidth = '90vw';
  video.style.borderRadius = '12px';
  video.style.boxShadow = '0 0 20px rgba(0,0,0,0.6)';
  video.style.objectFit = 'cover';

  const instruction = document.createElement('div');
  instruction.textContent = 'Align your face in the frame. Capturing in 3 seconds...';
  instruction.style.color = '#fff';
  instruction.style.fontSize = '14px';

  overlay.appendChild(video);
  overlay.appendChild(instruction);
  document.body.appendChild(overlay);

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  video.srcObject = stream;

  // Wait for video metadata so we know dimensions
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve();
    } else {
      video.onloadedmetadata = () => resolve();
    }
  });

  // Small delay so the user can position themselves
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Capture frame to canvas
  const canvas = document.createElement('canvas');
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('captureAndCheckin: Unable to get 2D context from canvas');
    stream.getTracks().forEach((t) => t.stop());
    document.body.removeChild(overlay);
    return;
  }

  ctx.drawImage(video, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
  );

  // Clean up video / overlay
  stream.getTracks().forEach((t) => t.stop());
  document.body.removeChild(overlay);

  if (!blob) {
    console.error('captureAndCheckin: Failed to capture frame as blob');
    return;
  }

  // Convert Blob -> File so we can reuse existing attendance API helper
  const file = new File([blob], 'face-checkin.jpg', { type: 'image/jpeg' });

  console.log('Sending captured frame to /api/attendance via api.attendance.markWithFace...');
  try {
    const response = await api.attendance.markWithFace(memberId, file as File);
    console.log('Face check-in response:', response);
  } catch (err: any) {
    console.error('Face check-in failed:', err?.message || err);
  }
}

