/* eslint-disable @typescript-eslint/no-explicit-any */
const DEFAULT_LOCAL_API_PORT = '5000';
const ENV_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '5000');
const IS_DEV = process.env.NODE_ENV !== 'production';

const resolveApiBaseUrls = (): string[] => {
  if (ENV_API_BASE_URL) {
    return [ENV_API_BASE_URL];
  }

  if (typeof window === 'undefined') {
    return [`http://localhost:${DEFAULT_LOCAL_API_PORT}/api`];
  }

  const host = window.location.hostname || 'localhost';
  const candidates = [
    `http://${host}:${DEFAULT_LOCAL_API_PORT}/api`,
    `http://localhost:${DEFAULT_LOCAL_API_PORT}/api`,
    `http://127.0.0.1:${DEFAULT_LOCAL_API_PORT}/api`,
  ];

  return Array.from(new Set(candidates));
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
                lowerEndpoint.includes('/fingerprints/');
              if (!isLoginRequest && !isBiometricEndpoint) {
                window.dispatchEvent(new CustomEvent('auth:logout'));
              }
            }
            // 403 on auth/login (e.g. deactivated/frozen account) must throw so login page can show the message
            const isAuthLogin =
              (endpoint || '').toLowerCase().includes('/auth/login') ||
              (url || '').toLowerCase().includes('/auth/login');
            if (response.status === 403 && !isAuthLogin) {
              // eslint-disable-next-line no-console
              console.warn('Access denied for this request', {
                url,
                status: response.status,
                message:
                  (typeof rawPayload?.error === 'string'
                    ? rawPayload.error
                    : rawPayload?.error?.message) || rawPayload?.message,
              });
              return null;
            }
            if (response.status === 403 && isAuthLogin) {
              const msg =
                (typeof rawPayload?.message === 'string' && rawPayload.message) ||
                (typeof rawPayload?.error === 'string' ? rawPayload.error : rawPayload?.error?.message) ||
                'Account is deactivated. Contact your owner.';
              throw new Error(msg);
            }
            let errorMessage =
              (typeof rawPayload?.message === 'string' && rawPayload.message) ||
              (typeof rawPayload?.error === 'string' ? rawPayload.error : rawPayload?.error?.message) ||
              `HTTP error! status: ${response.status}`;

            // Friendly message for payload too large / entity too large
            if (
              response.status === 413 ||
              errorMessage.toLowerCase().includes('entity too large') ||
              errorMessage.toLowerCase().includes('payload too large')
            ) {
              errorMessage = 'File too large. Please upload a smaller image or reduce the payload size.';
            }

            // eslint-disable-next-line no-console
            console.error('[api] request failed', {
              url,
              status: response.status,
              message: errorMessage,
            });

            const error = new Error(errorMessage) as Error & { status?: number };
            error.status = response.status;
            throw error;
          }

          let payload: any = rawPayload;

          // Normalize common API envelope shapes:
          // - { success, data }
          // - { data }
          if (payload && typeof payload === 'object') {
            const hasSuccessFlag = 'success' in payload;
            const hasDataField = 'data' in payload;

            if (hasDataField && (hasSuccessFlag ? (payload as ApiEnvelope).success !== false : true)) {
              payload = (payload as ApiEnvelope).data;
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
          const isNetworkError =
            fetchError instanceof TypeError ||
            isAbortError ||
            (fetchError instanceof Error && fetchError.message === 'Failed to fetch');
          if (!isNetworkError) {
            throw fetchError;
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
        throw new Error(
          'Unable to reach the server. Check that the backend is running (e.g. run "npm run dev" in the backend folder) and that the API URL is correct.'
        );
      }
      throw err || new Error('Unable to connect to API server');
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // Auth endpoints - login returns structured error on failure (no throw)
  auth: {
    async login(credentials: { email: string; password: string }) {
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
          if (urlList.indexOf(baseUrl) === urlList.length - 1) throw err;
        }
      }
      return { success: false, message: 'Invalid credentials' };
    },

    signup: (data: { gymName: string; firstName: string; lastName: string; email: string; password: string; gymIcon?: string }) =>
      api.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createManager: (managerData: any) =>
      api.request('/auth/create-manager', {
        method: 'POST',
        body: JSON.stringify(managerData),
      }),
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

    renew: (memberId: string, data: { membership: string; planQuantity?: number; paidAmount?: number }) =>
      api.request(`/members/${memberId}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          membership: data.membership,
          planQuantity: data.planQuantity ?? 1,
          paidAmount: data.paidAmount ?? 0,
        }),
      }),
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

      getBranchManagerAnalytics: (params?: { year?: number; month?: number; startDate?: string; endDate?: string }) => {
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
    getTotal: (startDate: string, endDate: string) =>
      api.request(`/expenses/total?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
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
    create: (data: { name: string }) =>
      api.request('/expense-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; isActive?: boolean }) =>
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
    /** Simulate fingerprint enrollment (no member). For add-member flow before member is created. */
    simulateEnroll: () =>
      api.request('/fingerprints/simulate-enroll', {
        method: 'POST',
        body: JSON.stringify({}),
      }),

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

    enrollFingerprint: (memberId: string, branchId?: string) => {
      const payload: any = { memberId };
      if (branchId) {
        payload.branchId = branchId;
      }
      return api.request('/fingerprints/enroll', {
        method: 'POST',
        body: JSON.stringify(payload),
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
    getStaff: () => api.request('/users/staff'),
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
