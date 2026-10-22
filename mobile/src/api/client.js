import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_API_URL = 'http://localhost:5000/api';

let apiBaseUrl = DEFAULT_API_URL;
let onUnauthorized = null;

/**
 * Accepts "192.168.1.10", "192.168.1.10:5000" or a full URL and always
 * returns something like "http://192.168.1.10:5000/api".
 */
export function normalizeApiUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return DEFAULT_API_URL;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, '');
  // Add /api when the user only entered host[:port] or host/
  const withoutProtocol = url.replace(/^https?:\/\//i, '');
  if (!withoutProtocol.includes('/')) return `${url}/api`;
  if (/^https?:\/\/[^/]+\/?$/i.test(url)) return `${url}/api`;
  return url;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export async function loadApiBaseUrl() {
  try {
    const saved = await AsyncStorage.getItem('apiUrl');
    if (saved) apiBaseUrl = normalizeApiUrl(saved);
  } catch {
    // Ignore storage errors; keep the default.
  }
  return apiBaseUrl;
}

export async function saveApiBaseUrl(url) {
  apiBaseUrl = normalizeApiUrl(url);
  await AsyncStorage.setItem('apiUrl', apiBaseUrl);
  return apiBaseUrl;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

const api = axios.create({ timeout: 25000 });

api.interceptors.request.use(async (config) => {
  config.baseURL = apiBaseUrl;
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

export async function testConnection(url) {
  const base = normalizeApiUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${base}/health`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Server replied ${response.status}`);
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export default api;
