'use client';

import { startRegistration as browserStartRegistration, startAuthentication as browserStartAuthentication } from '@simplewebauthn/browser';
import { api } from '../utils/api';

type WebAuthnResult =
  | { success: true; [k: string]: any }
  | { success: false; message: string };

export function useWebAuthn() {
  function toErrorMessage(errPayload: any, fallback: string) {
    const msg =
      errPayload?.error?.message ||
      (typeof errPayload?.error === 'string' ? errPayload.error : null) ||
      errPayload?.message ||
      fallback;
    return typeof msg === 'string' ? msg : fallback;
  }

  async function startRegistration(): Promise<WebAuthnResult> {
    try {
      if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
        return { success: false, message: 'WebAuthn is not supported in this browser.' };
      }

      const optsRes: any = await api.auth.webauthn.registerOptions();
      if (optsRes?.success === false || typeof optsRes?.error === 'string') {
        return { success: false, message: toErrorMessage(optsRes, 'Failed to get registration options.') };
      }

      // api.request normalizes responses; depending on server envelope shape, we may get:
      // - { options: <registrationOptions> }
      // - <registrationOptions> (rare)
      const options = optsRes?.data?.options ?? optsRes?.options ?? optsRes;
      if (!options) return { success: false, message: 'Missing registration options from server.' };

      const registrationResponse = await browserStartRegistration(options);
      const verifyRes: any = await api.auth.webauthn.registerVerify(registrationResponse);

      if (verifyRes?.success === false || typeof verifyRes?.error === 'string') {
        return { success: false, message: toErrorMessage(verifyRes, 'Fingerprint registration failed.') };
      }

      if (verifyRes?.verified !== true) {
        return { success: false, message: toErrorMessage(verifyRes, 'Fingerprint registration failed.') };
      }

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Fingerprint registration failed.';
      return { success: false, message: msg };
    }
  }

  async function startAuthentication(email: string): Promise<WebAuthnResult & { token?: string; user?: any }> {
    try {
      if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
        return { success: false, message: 'WebAuthn is not supported in this browser.' };
      }

      const optsRes: any = await api.auth.webauthn.loginOptions(email);
      if (optsRes?.success === false || typeof optsRes?.error === 'string') {
        return { success: false, message: toErrorMessage(optsRes, 'Failed to get login options.') };
      }

      const options = optsRes?.data?.options ?? optsRes?.options ?? optsRes;
      if (!options) return { success: false, message: 'Missing login options from server.' };

      const authenticationResponse = await browserStartAuthentication(options);
      const verifyRes: any = await api.auth.webauthn.loginVerify(authenticationResponse);

      if (verifyRes?.success === false || typeof verifyRes?.error === 'string') {
        return { success: false, message: toErrorMessage(verifyRes, 'Fingerprint login failed.') };
      }

      // api.request returns the `data` section, so login verify typically becomes:
      // - { token, user } (no `success` field)
      if (verifyRes?.token && verifyRes?.user) {
        return { success: true, token: verifyRes.token, user: verifyRes.user };
      }

      return { success: false, message: toErrorMessage(verifyRes, 'Fingerprint login failed.') };
    } catch (err: any) {
      const msg = err?.message || 'Fingerprint login failed.';
      return { success: false, message: msg };
    }
  }

  return { startRegistration, startAuthentication };
}

