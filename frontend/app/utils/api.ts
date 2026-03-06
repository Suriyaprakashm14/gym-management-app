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
  
  async request(endpoint: string, options: RequestInit = {}) {
    const defaultHeaders: Record<string, string> = {};

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
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
    if (options.headers != null && typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
      if (Array.isArray(options.headers)) {
        options.headers.forEach(([k, v]) => {
          if (k != null && v != null) headersObj[String(k)] = String(v);
        });
      } else {
        Object.entries(options.headers).forEach(([k, v]) => {
          if (v != null) headersObj[k] = String(v);
        });
      }
    }

    // Build a minimal RequestInit with only plain values. Do NOT spread options:
    // some environments (e.g. Next.js / polyfills) iterate init with .reduce()
    // and throw if any value is undefined or an unexpected type.
    const method = (options.method != null && typeof options.method === 'string') ? options.method : 'GET';
    const fetchInit: RequestInit = {};

    fetchInit.method = method;

    // Only attach headers if non-empty
    if (headersObj && Object.keys(headersObj).length > 0) {
      fetchInit.headers = headersObj;
    }

    // Only attach body if truly defined
    if (typeof options.body !== 'undefined' && options.body !== null) {
      fetchInit.body = options.body;
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

          const response = await fetch(url, {
            ...fetchInit,
            signal: controller.signal ?? undefined,
          });
          const contentType = response.headers.get('content-type') || '';
          const isJsonResponse = contentType.includes('application/json');
          const rawPayload: ApiEnvelope | any = isJsonResponse ? await response.json() : await response.text();

          if (!response.ok) {
            // Only trigger global logout for 401 on authenticated requests, not on login failure
            if (response.status === 401 && typeof window !== 'undefined') {
              const isLoginRequest = endpoint.toLowerCase().includes('/auth/login');
              if (!isLoginRequest) {
                window.dispatchEvent(new CustomEvent('auth:logout'));
              }
            }
            const errorMessage =
              (typeof rawPayload?.error === 'string' ? rawPayload.error : rawPayload?.error?.message) ||
              rawPayload?.message ||
              `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
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

  // Auth endpoints
  auth: {
    login: (credentials: { email: string; password: string }) =>
      api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    createManager: (managerData: any) =>
      api.request('/auth/create-manager', {
        method: 'POST',
        body: JSON.stringify(managerData),
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
    
    delete: (id: string) =>
      api.request(`/members/${id}`, {
        method: 'DELETE',
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
    
      // Analytics endpoints
      getGymOwnerAnalytics: (params?: { year?: number; month?: number }) => {
        const queryString = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
        return api.request(`/payments/analytics/gym-owner${queryString}`);
      },
      
      getBranchManagerAnalytics: (params?: { year?: number; month?: number }) => {
        const queryString = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
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

  // Members Personal Details endpoints
  membersPersonalDetails: {
    getAll: () => api.request('/members-personal-details'),
    
    create: (personalDetails: any) =>
      api.request('/members-personal-details', {
        method: 'POST',
        body: JSON.stringify(personalDetails),
      }),
    
    getByMemberId: (memberId: string) => 
      api.request(`/members-personal-details/member/${memberId}`),
    
    update: (memberId: string, personalDetails: any) =>
      api.request(`/members-personal-details/member/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(personalDetails),
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
