import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Button, Card, Input, Row } from '../components/UI';
import { normalizeApiUrl, testConnection } from '../api/client';
import { colors, radius, spacing } from '../theme';
import { errorMessage } from '../utils/format';

export default function LoginScreen() {
  const { login, serverUrl, updateServerUrl } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServer, setShowServer] = useState(!serverUrl || /localhost|127\.0\.0\.1/.test(serverUrl));
  const [serverInput, setServerInput] = useState(serverUrl || '');
  const [testing, setTesting] = useState(false);

  const friendlyError = (err) => {
    const message = err?.response?.data?.error;
    if (message) return message;
    if (err?.code === 'ECONNABORTED' || /network/i.test(err?.message || '')) {
      return `Cannot reach the server. Check that the shop PC is on and the address is ${normalizeApiUrl(serverInput)}`;
    }
    return errorMessage(err, 'Login failed. Check your credentials.');
  };

  const handleSubmit = async () => {
    if (!phone.trim() || !password) {
      toast.error('Enter your phone number and password');
      return;
    }
    setLoading(true);
    try {
      await updateServerUrl(serverInput);
      await login(phone, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!serverInput.trim()) return toast.error('Enter the server address first');
    setTesting(true);
    try {
      await testConnection(serverInput);
      toast.success('Server reachable ✅');
    } catch {
      toast.error(`No response from ${normalizeApiUrl(serverInput)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.logo}>📱</Text>
          <Text style={styles.title}>Mobile Shop</Text>
          <Text style={styles.subtitle}>Management System — Sign In</Text>
        </View>

        <Card style={styles.card}>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="03001234567"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={handleSubmit}
          />

          <Button
            title={loading ? 'Signing in...' : '🔐 Sign In'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 4 }}
          />

          <Pressable onPress={() => setShowServer((value) => !value)} style={styles.serverToggle}>
            <Text style={styles.serverToggleText}>
              ⚙️ Server: {normalizeApiUrl(serverUrl || serverInput)}
            </Text>
            <Text style={styles.serverToggleHint}>{showServer ? 'Hide' : 'Change'}</Text>
          </Pressable>

          {showServer && (
            <View style={styles.serverBox}>
              <Input
                label="Server address"
                value={serverInput}
                onChangeText={setServerInput}
                placeholder="http://192.168.1.10:5000/api"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.hint}>
                On a phone, use the shop PC's Wi-Fi IP address — not localhost. Example:{'\n'}
                http://192.168.1.10:5000/api
              </Text>
              <Button title="Test connection" variant="ghost" size="sm" onPress={handleTest} loading={testing} />
            </View>
          )}
        </Card>

        <View style={styles.ownerBox}>
          <Text style={styles.ownerTitle}>Same account as the website</Text>
          <Text style={styles.ownerText}>Use your existing shop phone number and password.</Text>
        </View>

        <Text style={styles.footer}>Staff can sign in with the phone number and password you create in Staff.</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 54 },
  title: { fontSize: 26, fontWeight: '800', color: colors.white, marginTop: 8 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 3 },
  card: { borderRadius: radius.lg, padding: spacing.xl },
  serverToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serverToggleText: { fontSize: 11, color: colors.textMuted, flex: 1 },
  serverToggleHint: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  serverBox: { marginTop: spacing.md, backgroundColor: '#f8fafc', borderRadius: radius.md, padding: spacing.md },
  hint: { fontSize: 10, color: colors.textMuted, lineHeight: 15, marginBottom: spacing.sm },
  ownerBox: { marginTop: spacing.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  ownerTitle: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  ownerText: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },
  footer: { textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: spacing.lg },
});
