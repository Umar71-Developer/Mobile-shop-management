import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Button, Card, Input, Screen, SectionTitle } from '../components/UI';
import { normalizeApiUrl, testConnection } from '../api/client';
import { colors, spacing } from '../theme';

export default function ServerSettingsScreen() {
  const { serverUrl, updateServerUrl, logout } = useAuth();
  const toast = useToast();
  const [input, setInput] = useState(serverUrl || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      await testConnection(input);
      toast.success('Server reachable ✅');
    } catch {
      toast.error(`No response from ${normalizeApiUrl(input)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await updateServerUrl(input);
      setInput(saved);
      toast.success('Server address saved');
    } catch {
      toast.error('Could not save the server address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>Server address</SectionTitle>
        <Input
          label="API base URL"
          value={input}
          onChangeText={setInput}
          placeholder="http://192.168.1.10:5000/api"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.current}>Current: {normalizeApiUrl(serverUrl)}</Text>
        <View style={styles.actions}>
          <Button title="Test" variant="ghost" onPress={handleTest} loading={testing} style={{ flex: 1 }} />
          <Button title="Save" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <SectionTitle>Connecting your phones</SectionTitle>
        <Text style={styles.step}>1. Keep the backend running on the shop PC.</Text>
        <Text style={styles.step}>2. Find the PC's Wi-Fi IP with <Text style={styles.code}>ipconfig</Text> (e.g. 192.168.1.10).</Text>
        <Text style={styles.step}>3. Use <Text style={styles.code}>http://192.168.1.10:5000/api</Text> on every phone.</Text>
        <Text style={styles.step}>4. Phones must be on the same Wi-Fi as the shop PC.</Text>
        <Text style={styles.step}>5. Allow Node.js through Windows Firewall on private networks.</Text>
        <Text style={styles.note}>
          Working outside the shop? Host the backend online and use its HTTPS address here instead.
          Changing servers signs you out of the old data — sign in again afterwards.
        </Text>
        <Button title="Save & sign out" variant="danger" onPress={async () => { await updateServerUrl(input); await logout(); }} style={{ marginTop: spacing.md }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: 8 },
  step: { fontSize: 12, color: colors.textMuted, lineHeight: 19, marginBottom: 2 },
  code: { fontFamily: 'monospace', color: colors.text },
  note: { fontSize: 11, color: colors.warning, marginTop: spacing.md, lineHeight: 17 },
});
