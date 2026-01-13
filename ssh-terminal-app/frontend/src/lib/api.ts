import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/api/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  logout: () => api.post('/api/auth/logout'),
  
  getMe: () => api.get('/api/auth/me'),
  
  googleLogin: () => {
    window.location.href = `${API_URL}/api/auth/google`;
  },
};

// SSH Connections API
export const sshAPI = {
  getConnections: () => api.get('/api/ssh/connections'),
  
  getConnection: (id: number) => api.get(`/api/ssh/connections/${id}`),
  
  createConnection: (data: {
    name: string;
    host: string;
    port: number;
    username: string;
    auth_type: string;
    password?: string;
    private_key?: string;
  }) => api.post('/api/ssh/connections', data),
  
  updateConnection: (id: number, data: {
    name: string;
    host: string;
    port: number;
    username: string;
    auth_type: string;
    password?: string;
    private_key?: string;
  }) => api.put(`/api/ssh/connections/${id}`, data),
  
  deleteConnection: (id: number) => api.delete(`/api/ssh/connections/${id}`),
  
  testConnection: (id: number) => api.post(`/api/ssh/connections/${id}/test`),
};

// WebSocket URL helper
export const getWebSocketURL = (connectionId: number, userId: number) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
  const token = localStorage.getItem('token');
  return `${wsProtocol}//${wsHost}/ws/ssh/${connectionId}?user_id=${userId}&token=${token}`;
};

export default api;
