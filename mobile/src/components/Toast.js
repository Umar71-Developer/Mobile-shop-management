import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const TONES = {
  success: { bg: '#dcfce7', border: '#86efac', text: '#166534', icon: '✅' },
  error: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', icon: '⚠️' },
  info: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', icon: 'ℹ️' },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback((message, tone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(hide, 3200);
  }, [anim, hide]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              backgroundColor: TONES[toast.tone].bg,
              borderColor: TONES[toast.tone].border,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <Text style={styles.icon}>{TONES[toast.tone].icon}</Text>
          <Text style={[styles.text, { color: TONES[toast.tone].text }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  icon: { marginRight: spacing.sm, fontSize: 15 },
  text: { flex: 1, fontSize: 13, fontWeight: '600' },
});
