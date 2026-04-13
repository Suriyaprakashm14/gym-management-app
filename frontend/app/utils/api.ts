/* eslint-disable @typescript-eslint/no-explicit-any */
/** Must match backend dev env (`backend/.env` currently uses PORT=5050). */
const DEFAULT_LOCAL_API_PORT = '5050';
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL;
// Backend mounts routes at /api (e.g. /api/auth/signup). Ensure base URL ends with /api.
const ENV_API_BASE_URL =
  RAW_API_BASE && RAW_API_BASE.trim().length > 0
    ? RAW_API_BASE.trim().replace(/\/api\/?$/, '') + '/api'
    : undefined;
const DEFAULT_API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '5000');
const IS_DEV = process.env.NODE_ENV !== 'production';

const resolveApiBaseUrls = (): string[] => {
  const envBase = ENV_API_BASE_URL ? [ENV_API_BASE_URL] : [];

  if (typeof window === 'undefined') {
    // SSR/route handlers in dev should still default to local backend.
    const localDefault = `http://localhost:${DEFAULT_LOCAL_API_PORT}/api`;
    return IS_DEV ? Array.from(new Set([localDefault, ...envBase])) : (envBase.length ? envBase : [localDefault]);
  }

  const host = window.location.hostname || 'localhost';
  const localCandidates = [
    `http://${host}:${DEFAULT_LOCAL_API_PORT}/api`,
    `http://localhost:${DEFAULT_LOCAL_API_PORT}/api`,
    `http://127.0.0.1:${DEFAULT_LOCAL_API_PORT}/api`,
  ];

  // In development, prefer local backend first even if NEXT_PUBLIC_API_URL is stale.
  // In production, keep explicit env URL as the primary target.
  const prioritized = IS_DEV ? [...localCandidates, ...envBase] : [...envBase, ...localCandidates];
  return Array.from(new Set(prioritized));
};

type ApiEnvelope<T = any> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
};

export const api = {
  baseURL: ENV_API_BASE_URL || `http://localhost:${DEFAULT_LOCAL_API_PORT}/api`,
  
  async request(endpoint: string, options?: RequestInit | null) {
    // Normalize so we never read from undefined/null (avoids "Cannot convert undefined or null to object")
    const opts: RequestInit = options != null && typeof options === 'object' ? options : {};

    const defaultHeaders: Record<string, string> = {};

    // Only set Content-Type for non-FormData requests
    if (!(opts.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Build headers as a plain object only (never undefined). Some environments
    // call .reduce on headers; passing undefined or a Headers instance can throw.
    const headersObj: Record<string, string> = { ...defaultHeaders };
    const rawHeaders = opts.headers;
    if (rawHeaders != null && typeof rawHeaders === 'object' && !(rawHeaders instanceof Headers)) {
      try {
        if (Array.isArray(rawHeaders)) {
          rawHeaders.forEach(([k, v]) => {
            if (k != null && v != null) headersObj[String(k)] = String(v);
          });
        } else {
          Object.entries(rawHeaders).forEach(([k, v]) => {
            if (v != null) headersObj[k] = String(v);
          });
        }
      } catch {
        // Ignore invalid headers (e.g. non-plain object)
      }
    }

    // Build a minimal RequestInit with only plain values. Do NOT pass undefined/null
    // so polyfills that do Object.keys/entries on init don't throw.
    const method = (opts.method != null && typeof opts.method === 'string') ? opts.method : 'GET';
    const fetchInit: RequestInit = {
      method,
      credentials: 'include',
    };

    if (Object.keys(headersObj).length > 0) {
      fetchInit.headers = headersObj;
    }

    if (opts.body !== undefined && opts.body !== null) {
      fetchInit.body = opts.body;
    }

    const baseUrls = resolveApiBaseUrls();
    const urlList: string[] = Array.isArray(baseUrls) && baseUrls.length > 0 ? baseUrls : [api.baseURL];
    let lastError: unknown = null;

    try {
      for (const baseUrl of urlList) {
        const url = `${baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS);

        try {
          if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.debug('[api] request', { url, method });
          }

          const init: RequestInit = { ...fetchInit };
          if (controller.signal != null) {
            init.signal = controller.signal;
          }
          const response = await fetch(url, init);
          const contentType = response.headers.get('content-type') || '';
          const isJsonResponse = contentType.includes('application/json');
          let rawPayload: ApiEnvelope | any = null;
          if (isJsonResponse) {
            try {
              rawPayload = await response.json();
            } catch {
              // If body is empty or invalid JSON, fall back to null and rely on status/message
              rawPayload = null;
            }
          } else {
            rawPayload = await response.text();
          }

          if (!response.ok) {
            // Only trigger global logout for 401 on authenticated requests, not on login failure
            if (response.status === 401 && typeof window !== 'undefined') {
              const lowerEndpoint = endpoint.toLowerCase();
              const isLoginRequest = lowerEndpoint.includes('/auth/login');
              // Biometric endpoints may return 401 for third‑party API issues (e.g. Luxand token),
              // which should NOT log the user out.
              const isBiometricEndpoint =
                lowerEndpoint.includes('/attendance/enroll-face') ||
                lowerEndpoint.includes('/attendance/photo-only') ||
                lowerEndpoint.includes('/attendance/dual-auth') ||
                lowerEndpoint.includes('/members/register-fingerprint') ||
                lowerEndpoint.includes('/members/verify-fingerprint');
              if (!isLoginRequest && !isBiometricEndpoint) {
                window.dispatchEvent(new CustomEvent('auth:logout'));
              }
            }
            // 403 on auth/login (e.g. deactivated/frozen account) must throw so login page can show the message
            const isAuthLogin =
              (endpoint || '').toLowerCase().includes('/auth/login') ||
              (url || '').toLowerCase().includes('/auth/login');
            if (response.status === 403 && !isAuthLogin) {
              return null;
            }
            if (response.status === 403 && isAuthLogin) {
              const msg =
                (typeof rawPayload?.message === 'string' && rawPayload.message) ||
                (typeof rawPayload?.error === 'string' ? rawPayload.error : rawPayload?.error?.message) ||
                'Account is deactivated. Contact your owner.';
              return { success: false, error: msg, status: response.status };
            }
            // Prefer the human-readable message from nested details over the error code.
            // Backend shape: { error: { code, message: "ERROR_CODE", details: { message: "Human text" } } }
            const errorMessage =
              (typeof rawPayload?.message === 'string' && rawPayload.message) ||
              (typeof rawPayload?.error === 'string'
                ? rawPayload.error
                : (typeof rawPayload?.error?.details?.message === 'string' && rawPayload?.error?.details?.message) ||
                  (typeof rawPayload?.error?.details?.error === 'string' && rawPayload?.error?.details?.error) ||
                  (typeof rawPayload?.error?.message === 'string' && rawPayload?.error?.message)) ||
              `HTTP error! status: ${response.status}`;

            // Friendly message for payload too large / entity too large
            const friendlyMessage =
              response.status === 413 ||
              (String(errorMessage).toLowerCase().includes('entity too large') ||
                String(errorMessage).toLowerCase().includes('payload too large'))
                ? 'File too large. Please upload a smaller image or reduce the payload size.'
                : errorMessage;

            return {
              success: false,
              error: typeof friendlyMessage === 'string' ? friendlyMessage : 'Request failed',
              status: response.status,
            };
          }

          let payload: any = rawPayload;

          // Normalize common API envelope shapes:
          // - { success, data }
          // - { data }
          if (payload && typeof payload === 'object') {
            const hasSuccessFlag = 'success' in payload;
            const hasDataField = 'data' in payload;
            const dataVal = (payload as ApiEnvelope).data;
            const isEmptyData =
              dataVal !== undefined &&
              typeof dataVal === 'object' &&
              dataVal !== null &&
              !Array.isArray(dataVal) &&
              Object.keys(dataVal).length === 0;

            if (
              hasDataField &&
              (hasSuccessFlag ? (payload as ApiEnvelope).success !== false : true) &&
              !isEmptyData
            ) {
              payload = dataVal;
            }
          }

          if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.debug('[api] response', {
              url,
              ok: response.ok,
              status: response.status,
              isJsonResponse,
              typeofPayload: typeof payload,
            });
          }

          // If payload is null or undefined, normalize it
        // Normalize null/undefined safely
        if (payload == null) {
          return [];
        }

        // If API returns array → good
        if (Array.isArray(payload)) {
          return payload;
        }

        // If API returns object → return as-is
        if (typeof payload === 'object') {
          return payload;
        }

        // Fallback safety
        return [];
        } catch (fetchError) {
          lastError = fetchError;
          const isAbortError =
            fetchError instanceof DOMException && fetchError.name === 'AbortError';
          if (isAbortError) {
            if (IS_DEV) {
              // eslint-disable-next-line no-console
              console.warn('[api] request aborted', { url, method });
            }
            return { success: false, aborted: true, status: 0 };
          }
          const isNetworkError =
            fetchError instanceof TypeError ||
            (fetchError instanceof Error && fetchError.message === 'Failed to fetch');
          if (!isNetworkError) {
            const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
            return { success: false, error: errMsg, status: 0 };
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      const err = lastError as Error | null;
      const isConnectionError =
        err instanceof TypeError ||
        (err instanceof Error && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) ||
        (err instanceof DOMException && err.name === 'AbortError');
      if (isConnectionError) {
        return {
          success: false,
          error:
            'Unable to reach the server. Check that the backend is running (e.g. run "npm run dev" in the backend folder) and that the API URL is correct.',
          status: 0,
        };
      }
      const fallbackMsg = err instanceof Error ? err.message : 'Unable to connect to API server';
      return { success: false, error: fallbackMsg, status: 0 };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errMsg, status: 0 };
    }
  },

  // Auth endpoints - login returns structured error on failure (no throw)
  auth: {
    async login(credentials: { phone?: string; email?: string; password: string }): Promise<{
      success: boolean;
      token?: string;
      user?: any;
      message?: string;
      aborted?: boolean;
    }> {
      const endpoint = '/auth/login';
      const opts: RequestInit = {
        method: 'POST',
        body: JSON.stringify(credentials),
      };
      const baseUrls = resolveApiBaseUrls();
      const urlList = Array.isArray(baseUrls) && baseUrls.length > 0 ? baseUrls : [api.baseURL];
      for (const baseUrl of urlList) {
        const url = `${baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS);
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const response = await fetch(url, { ...opts, headers, signal: controller.signal });
          const contentType = response.headers.get('content-type') || '';
          const isJson = contentType.includes('application/json');
          let rawPayload: ApiEnvelope | any = null;
          if (isJson) {
            try {
              rawPayload = await response.json();
            } catch {
              rawPayload = null;
            }
          }
          clearTimeout(timeoutId);
          if (!response.ok) {
            return {
              success: false,
              message: (typeof rawPayload?.message === 'string' ? rawPayload.message : null) || 'Invalid credentials',
            };
          }
          if (!rawPayload || typeof rawPayload !== 'object') {
            return { success: false, message: 'Invalid credentials' };
          }
          // Backend may return { data: { token, user } } or { token, user } at top level
          const data = rawPayload.data && typeof rawPayload.data === 'object' ? rawPayload.data : rawPayload;
          const token = data.token ?? rawPayload.token;
          const user = data.user ?? rawPayload.user;
          if (!token || !user) {
            return { success: false, message: 'Invalid credentials' };
          }
          return { success: true, token, user };
        } catch (err) {
          clearTimeout(timeoutId);
          const isAbortError =
            (err instanceof DOMException && err.name === 'AbortError') ||
            (err instanceof Error && err.name === 'AbortError');
          if (isAbortError) {
            if (IS_DEV) {
              // eslint-disable-next-line no-console
              console.warn('[api.auth.login] request aborted', { url });
            }
            return { success: false, aborted: true, message: 'Request aborted' };
          }
          const isNetworkError =
            err instanceof TypeError ||
            (err instanceof Error &&
              (err.message === 'Failed to fetch' || err.message.toLowerCase().includes('network'))) ||
            (err instanceof Error && err.name === 'TypeError');
          if (urlList.indexOf(baseUrl) === urlList.length - 1 || !isNetworkError) {
            if (IS_DEV) {
              // eslint-disable-next-line no-console
              console.error('[api.auth.login] request failed', err);
            }
            const msg = err instanceof Error ? err.message : 'Network error';
            return { success: false, message: msg || 'Network error' };
          }
        }
      }
      return { success: false, message: 'Invalid credentials' };
    },

    signup: (data: {
      gymName: string;
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      password: string;
      gymIcon?: string;
    }) =>
      api.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createManager: (managerData: any) =>
      api.request('/auth/create-manager', {
        method: 'POST',
        body: JSON.stringify(managerData),
      }),

      forgotPassword: (payload: { email?: string; phone?: string }) =>
        api.request('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({
            ...(payload.email ? { email: payload.email.toLowerCase().trim() } : {}),
            ...(payload.phone ? { phone: payload.phone.trim() } : {}),
            type: 'password_reset',
          }),
        }),

      verifyOtp: (email: string, otp: string, type = 'password_reset') =>
        api.request('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email: email.toLowerCase(), otp, type }),
        }),

    resetPassword: (email: string, otp: string, newPassword: string) =>
      api.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase(), otp, newPassword }),
      }),

      resendOtp: (payload: { email?: string; phone?: string }, type = 'password_reset') =>
        api.request('/auth/resend-otp', {
          method: 'POST',
          body: JSON.stringify({
            ...(payload.email ? { email: payload.email.toLowerCase().trim() } : {}),
            ...(payload.phone ? { phone: payload.phone.trim() } : {}),
            type,
          }),
        }),

    resetUserPassword: (userId: string, body: { newPassword: string }) =>
      api.request(`/auth/reset-user-password/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    // WebAuthn (Windows Hello / fingerprint) endpoints for user authentication
    webauthn: {
      registerOptions: () =>
        api.request('/auth/webauthn/register-options', {
          method: 'POST',
          body: JSON.stringify({}),
        }),

      registerVerify: (registrationResponse: any) =>
        api.request('/auth/webauthn/register-verify', {
          method: 'POST',
          body: JSON.stringify({ response: registrationResponse }),
        }),

      loginOptions: (email: string) =>
        api.request('/auth/webauthn/login-options', {
          method: 'POST',
          body: JSON.stringify({ email }),
        }),

      loginVerify: (authenticationResponse: any) =>
        api.request('/auth/webauthn/login-verify', {
          method: 'POST',
          body: JSON.stringify({ response: authenticationResponse }),
        }),
    },
  },

  // Gyms endpoints (gym owner updates name/logo)
  gyms: {
    getMyGym: () => api.request('/gyms/my-gym'),
    getById: (gymId: string) => api.request(`/gyms/${gymId}`),
    update: (gymId: string, data: { name?: string; logoUrl?: string | null }) =>
      api.request(`/gyms/${gymId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    removeLogo: () =>
      api.request('/gyms/logo', {
        method: 'DELETE',
      }),
  },

  // Members endpoints
  members: {
    getAll: (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return api.request(`/members${queryString}`);
    },
    
    create: (memberData: any) => {
      // Check if it's FormData (for file uploads)
      if (memberData instanceof FormData) {
        return api.request('/members', {
          method: 'POST',
          body: memberData,
          headers: {}, // Let browser set Content-Type for FormData
        });
      }
      // Regular JSON data
      return api.request('/members', {
        method: 'POST',
        body: JSON.stringify(memberData),
      });
    },
    
          update: (id: string, memberData: any) => {
            // Check if it's FormData (for file uploads)
            if (memberData instanceof FormData) {
              return api.request(`/members/${id}`, {
                method: 'PATCH',
                body: memberData,
                headers: {}, // Let browser set Content-Type for FormData
              });
            }
            // Regular JSON data
            return api.request(`/members/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(memberData),
            });
          },

    updateProfileImage: (id: string, formData: FormData) =>
      api.request(`/members/${id}/profile-image`, {
        method: 'PATCH',
        body: formData,
        headers: {},
      }),
    
    delete: (id: string) =>
      api.request(`/members/${id}`, {
        method: 'DELETE',
      }),

    renew: (memberId: string, data: { membership: string; paidAmount?: number }) =>
      api.request(`/members/${memberId}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          membership: data.membership,
          paidAmount: data.paidAmount ?? 0,
        }),
      }),

    // WebAuthn (Windows Hello) fingerprint enrollment + check-in verification for members
    fingerprintWebAuthn: {
      // memberId optional for "pending enrollment" (fingerprint first)
      registerOptions: (memberId?: string, pendingUser?: { userName?: string; displayName?: string }) =>
        api.request('/members/register-fingerprint', {
          method: 'POST',
          body: JSON.stringify(memberId ? { memberId } : { pendingUser: pendingUser || {} }),
        }),
      registerVerify: (memberId: string | undefined, registrationResponse: any) =>
        api.request('/members/register-fingerprint', {
          method: 'POST',
          body: JSON.stringify(memberId ? { memberId, registrationResponse } : { registrationResponse }),
        }),
      // Attaches the pending fingerprint enrollment in session to the newly created member.
      attachPendingToMember: (memberId: string) =>
        api.request('/members/register-fingerprint', {
          method: 'POST',
          body: JSON.stringify({ memberId }),
        }),
      loginOptions: () =>
        api.request('/members/verify-fingerprint', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      loginVerify: (authenticationResponse: any) =>
        api.request('/members/verify-fingerprint', {
          method: 'POST',
          body: JSON.stringify({ authenticationResponse }),
        }),
    },
  },

  // Payments endpoints
  payments: {
    getAll: (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return api.request(`/payments${queryString}`);
    },
    
    create: (paymentData: any) =>
      api.request('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),

    createForBranch: (branchId: string, paymentData: any) =>
      api.request(`/payments/${branchId}`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),
    
    getStats: () => api.request('/payments/stats'),
    
      // Analytics endpoints (year/month OR startDate/endDate for date range)
      getGymOwnerAnalytics: (params?: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
        const queryString = params && Object.keys(params).length
          ? `?${new URLSearchParams(params as Record<string, string>)}`
          : '';
        return api.request(`/payments/analytics/gym-owner${queryString}`);
      },

      getBranchManagerAnalytics: (params?: { year?: number; month?: number; startDate?: string; endDate?: string; branchId?: string }) => {
        const queryString = params && Object.keys(params).length
          ? `?${new URLSearchParams(params as Record<string, string>)}`
          : '';
        return api.request(`/payments/analytics/branch-manager${queryString}`);
      },
      
      // Overdue payments endpoints
      getGymOwnerOverdue: () => api.request('/payments/analytics/overdue/gym-owner'),
      getBranchManagerOverdue: () => api.request('/payments/analytics/overdue/branch-manager'),
      
      // Payments by ID endpoints
      getByGymId: (gymId: string) => api.request(`/payments/${gymId}`),
      getByBranchId: (branchId: string) => api.request(`/payments/${branchId}`),
      
      // Pending payments with filters
      getPendingByGymId: (gymId: string) => api.request(`/payments/pending?gymId=${gymId}`),
      getPendingByBranchId: (branchId: string) => api.request(`/payments/pending?branchId=${branchId}`),
  },

  // Expenses endpoints
  expenses: {
    list: (params?: { startDate?: string; endDate?: string; branchId?: string }) => {
      const q = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return api.request(`/expenses${q}`);
    },
    getTotal: (startDate: string, endDate: string, branchId?: string) => {
      const params = new URLSearchParams({ startDate, endDate });
      if (branchId) params.set('branchId', branchId);
      return api.request(`/expenses/total?${params.toString()}`);
    },
    create: (data: { amount: number; date?: string; category?: string; description?: string; branchId?: string }) =>
      api.request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { amount?: number; date?: string; category?: string; description?: string }) =>
      api.request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      api.request(`/expenses/${id}`, { method: 'DELETE' }),
  },

  // Expense categories (master data, like membership types)
  expenseCategories: {
    list: () => api.request('/expense-categories'),
    create: (data: { name: string; description?: string }) =>
      api.request('/expense-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
      api.request(`/expense-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      api.request(`/expense-categories/${id}`, { method: 'DELETE' }),
  },

  // Branches endpoints
  branches: {
    getByGym: (gymId: string) => api.request(`/branches/${gymId}/branches`),
    getById: (branchId: string) => api.request(`/branches/branches/${branchId}`),
    create: (gymId: string, branchData: any) => 
      api.request(`/branches/${gymId}/branches`, {
        method: 'POST',
        body: JSON.stringify(branchData),
      }),
    update: (branchId: string, branchData: any) => 
      api.request(`/branches/branches/${branchId}`, {
        method: 'PUT',
        body: JSON.stringify(branchData),
      }),
    delete: (branchId: string) => 
      api.request(`/branches/branches/${branchId}`, {
        method: 'DELETE',
      }),
  },

  // Attendance endpoints
  attendance: {
    getReport: (params?: Record<string, string>) => {
      const queryString = params ? `?${new URLSearchParams(params)}` : '';
      return api.request(`/attendance/report${queryString}`);
    },
    
    markWithFace: (memberId: string, imageFile: File) => {
      const formData = new FormData();
      formData.append('memberId', memberId);
      formData.append('image', imageFile);
      
      return api.request('/attendance', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      });
    },
    
    markWithPhotoOnly: (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      return api.request('/attendance/photo-only', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      });
    },
    
    checkMembership: (memberId: string) => 
      api.request(`/attendance/check-membership/${memberId}`),
    
    checkReference: (memberId: string) => 
      api.request(`/attendance/check-reference/${memberId}`),
    
    enrollFace: (memberId: string, imageFile: File) => {
      const formData = new FormData();
      formData.append('memberId', memberId);
      formData.append('image', imageFile);
      
      return api.request('/attendance/enroll-face', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      });
    },
  },

  // Biometric enrollment helpers
  biometrics: {
    /** Create Luxand person only; returns personId. For add-member flow before member is created. */
    createFacePerson: (image: Blob) => {
      const formData = new FormData();
      formData.append('image', image, 'face-capture.jpg');
      return api.request('/attendance/enroll-face-pre', {
        method: 'POST',
        body: formData,
        headers: {},
      });
    },

    enrollFace: (memberId: string, image: Blob) => {
      const formData = new FormData();
      formData.append('memberId', memberId);
      formData.append('image', image, 'face-capture.jpg');
      return api.request('/attendance/enroll-face', {
        method: 'POST',
        body: formData,
        headers: {},
      });
    },
  },

  // Members Personal Details endpoints
  membersPersonalDetails: {
    getAll: () => api.request('/members-personal-details'),
    
    create: (personalDetails: any) =>
      api.request('/members-personal-details', {
        method: 'POST',
        body: JSON.stringify(personalDetails),
      }),
    
    getByMemberId: async (memberId: string) => {
      try {
        return await api.request(`/members-personal-details/member/${memberId}`);
      } catch (err: any) {
        // For this helper, treat any error as \"no details yet\" so Edit modal never crashes
        // and can still create details on save. Log the error for debugging.
        // eslint-disable-next-line no-console
        console.warn('membersPersonalDetails.getByMemberId failed, treating as empty:', err);
        return null;
      }
    },
    
    update: (memberId: string, personalDetails: any) =>
      api.request(`/members-personal-details/member/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(personalDetails),
      }),
  },

  // Staff endpoints
  staffs: {
    getStaffs: () => api.request('/staffs'),
    createStaff: (data: { firstName: string; lastName: string; email: string; password: string; branchId: string }) =>
      api.request('/staffs', { method: 'POST', body: JSON.stringify(data) }),
    updateStaff: (id: string, data: { firstName?: string; lastName?: string; status?: string; isActive?: boolean; branchId?: string }) =>
      api.request(`/staffs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteStaff: (id: string) =>
      api.request(`/staffs/${id}`, { method: 'DELETE' }),
  },

  // User listing and status (owner: managers + staff; manager: staff in branch only; activate/deactivate)
  users: {
    getStaff: (params?: { branchId?: string }) => {
      const queryString = params && params.branchId ? `?branchId=${encodeURIComponent(params.branchId)}` : '';
      return api.request(`/users/staff${queryString}`);
    },
    updateStatus: (userId: string, data: { isActive: boolean }) =>
      api.request(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // Membership Prices endpoints
  membershipPrices: {
    getAll: (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return api.request(`/membership-prices${queryString}`);
    },
    
    create: (membershipData: any) =>
      api.request('/membership-prices', {
        method: 'POST',
        body: JSON.stringify(membershipData),
      }),
    
    update: (id: string, membershipData: any) =>
      api.request(`/membership-prices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(membershipData),
      }),
    
    delete: (id: string) =>
      api.request(`/membership-prices/${id}`, {
        method: 'DELETE',
      }),
  },
};
