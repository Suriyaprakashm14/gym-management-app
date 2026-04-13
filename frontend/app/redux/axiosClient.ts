import axios from 'axios';

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL =
  RAW_BASE && RAW_BASE.trim().length > 0
    ? RAW_BASE.trim().replace(/\/api\/?$/, '') + '/api'
    : 'http://localhost:5001/api';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default axiosClient;
