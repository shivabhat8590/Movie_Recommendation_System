import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/auth/refresh`,
          { refreshToken }
        );
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const IMG = (path, size = 'w500') => {
  if (!path || path === 'undefined' || path === 'null') return 'https://placehold.co/500x750/1a1a2e/white?text=No+Poster';
  const sPath = String(path);
  if (sPath.startsWith('http')) return sPath;
  const cleanPath = sPath.startsWith('/') ? sPath : `/${sPath}`;
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
};

export const BACKDROP = (path) => {
  if (!path) return '';
  const sPath = String(path);
  if (sPath.startsWith('http')) return sPath;
  const cleanPath = sPath.startsWith('/') ? sPath : `/${sPath}`;
  return `https://image.tmdb.org/t/p/w1280${cleanPath}`;
};

