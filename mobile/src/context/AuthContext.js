import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { loadApiBaseUrl, saveApiBaseUrl, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const url = await loadApiBaseUrl();
      if (mounted) setServerUrl(url);
      try {
        const [token, savedUser] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        if (mounted && token && savedUser) setUser(JSON.parse(savedUser));
      } catch {
        // Corrupt storage: start signed out.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    setUnauthorizedHandler(() => {
      AsyncStorage.multiRemove(['token', 'user']).catch(() => {});
      setUser(null);
    });

    return () => { mounted = false; };
  }, []);

  const login = async (phone, password) => {
    const res = await api.post('/auth/login', { phone: phone.trim(), password });
    await AsyncStorage.multiSet([
      ['token', res.data.token],
      ['user', JSON.stringify(res.data.user)],
    ]);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'user']).catch(() => {});
  };

  const updateServerUrl = async (url) => {
    const saved = await saveApiBaseUrl(url);
    setServerUrl(saved);
    return saved;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, serverUrl, updateServerUrl }}>
      {children}
    </AuthContext.Provider>
  );
}
