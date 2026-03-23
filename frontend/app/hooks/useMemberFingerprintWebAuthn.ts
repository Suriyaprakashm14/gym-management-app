'use client';

import { startRegistration as browserStartRegistration, startAuthentication as browserStartAuthentication } from '@simplewebauthn/browser';
import { api } from '../utils/api';

type SuccessPayload = { status?: string; message?: string; [k: string]: any };
type FailurePayload = { status: 'error' | string; message: string; [k: string]: any };

export function useMemberFingerprintWebAuthn() {
  async function registerFingerprint(memberId: string): Promise<{ success: boolean; payload?: SuccessPayload; message?: string }> {
    try {
      const options = await api.members.fingerprintWebAuthn.registerOptions(memberId);
      // options are directly usable by @simplewebauthn/browser
      const registrationResponse = await browserStartRegistration(options);
      const verifyRes: any = await api.members.fingerprintWebAuthn.registerVerify(memberId, registrationResponse);

      // api.request returns `data` payload on success; on HTTP errors it returns { success:false, error:... }
      if (!verifyRes || verifyRes?.status !== 'success') {
        const msg = verifyRes?.error || verifyRes?.message || 'Fingerprint enrollment failed';
        return { success: false, message: typeof msg === 'string' ? msg : 'Fingerprint enrollment failed' };
      }

      return { success: true, payload: verifyRes };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Fingerprint enrollment failed' };
    }
  }

  async function registerPendingFingerprint(pendingUser?: { userName?: string; displayName?: string }): Promise<{ success: boolean; message?: string }> {
    try {
      const options = await api.members.fingerprintWebAuthn.registerOptions(undefined, pendingUser);
      const registrationResponse = await browserStartRegistration(options);
      const verifyRes: any = await api.members.fingerprintWebAuthn.registerVerify(undefined, registrationResponse);

      if (verifyRes?.status !== 'success') {
        const msg = verifyRes?.message || 'Fingerprint enrollment failed';
        return { success: false, message: typeof msg === 'string' ? msg : 'Fingerprint enrollment failed' };
      }
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Fingerprint enrollment failed';
      return { success: false, message: msg };
    }
  }

  async function attachPendingFingerprintToMember(memberId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res: any = await api.members.fingerprintWebAuthn.attachPendingToMember(memberId);
      if (res?.status === 'success') return { success: true };

      // If the backend falls back to "register options" (meaning no pending fingerprint exists in session),
      // `res` will look like WebAuthn registration options (it has `challenge`, `rp`, `user`, etc).
      if (typeof res?.challenge === 'string' && res?.rp && res?.user) {
        return {
          success: false,
          message: 'Fingerprint session expired. Please click "Register Fingerprint" again before creating the member.',
        };
      }

      const msg =
        res?.message ||
        res?.error?.message ||
        (typeof res?.error === 'string' ? res?.error : null) ||
        'Failed to attach fingerprint to member';

      return { success: false, message: typeof msg === 'string' ? msg : 'Failed to attach fingerprint to member' };
    } catch (err: any) {
      const msg = err?.message || 'Fingerprint attach failed';
      return { success: false, message: msg };
    }
  }

  async function verifyFingerprint(): Promise<{ success: boolean; payload?: SuccessPayload | FailurePayload; message?: string }> {
    try {
      const options = await api.members.fingerprintWebAuthn.loginOptions();
      const authenticationResponse = await browserStartAuthentication(options);
      const verifyRes: any = await api.members.fingerprintWebAuthn.loginVerify(authenticationResponse);

      if (!verifyRes) return { success: false, message: 'Fingerprint verification failed' };

      // HTTP errors from api.request
      if (verifyRes?.success === false || verifyRes?.error) {
        const msg = verifyRes?.error || verifyRes?.message || 'Authentication Failed or Subscription Issue';
        return { success: false, message: typeof msg === 'string' ? msg : 'Authentication Failed or Subscription Issue' };
      }

      // For subscription issues we return status:'error' with HTTP 200
      const status = verifyRes?.status;
      if (status === 'error') {
        return { success: false, payload: verifyRes, message: verifyRes?.message || 'Subscription invalid' };
      }

      if (status !== 'success') {
        return { success: false, message: 'Fingerprint verification failed' };
      }

      return { success: true, payload: verifyRes };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Fingerprint verification failed' };
    }
  }

  return { registerFingerprint, registerPendingFingerprint, attachPendingFingerprintToMember, verifyFingerprint };
}

