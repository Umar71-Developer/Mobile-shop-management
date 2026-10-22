import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

const TONES = {
  blue: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  green: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  red: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  orange: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  yellow: { bg: '#fef9c3', text: '#a16207', border: '#fef08a' },
  purple: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  gray: { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
};

export function Screen({ children, refreshing = false, onRefresh, style, contentStyle }) {
  return (
    <View style={[styles.screen, style]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        ) : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, style }) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    success: { bg: colors.success, fg: colors.white, border: colors.success },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    dark: { bg: colors.dark, fg: colors.white, border: colors.dark },
    ghost: { bg: colors.white, fg: colors.textMuted, border: colors.border },
    soft: { bg: '#eff6ff', fg: colors.primary, border: '#bfdbfe' },
  }[variant] || { bg: colors.primary, fg: colors.white, border: colors.primary };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: size === 'sm' ? 7 : 12,
          paddingHorizontal: size === 'sm' ? 12 : 16,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <Text style={[styles.buttonText, { color: palette.fg, fontSize: size === 'sm' ? 12 : 14 }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, children, style }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
    </View>
  );
}

export function Input({ label, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <TextInput
        placeholderTextColor={colors.textLight}
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[
          styles.input,
          props.multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          style,
        ]}
      />
    </Field>
  );
}

export function Select({ label, value, options = [], onChange, placeholder = 'Select...', allowClear = false, inline = false }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => String(option.value) === String(value));

  const rows = (
    <ScrollView
      style={{ maxHeight: inline ? 220 : 380 }}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {allowClear && (
        <Pressable
          style={styles.option}
          onPress={() => { onChange(''); setOpen(false); }}
        >
          <Text style={styles.optionText}>None</Text>
        </Pressable>
      )}
      {options.map((option) => {
        const active = String(option.value) === String(value);
        return (
          <Pressable
            key={String(option.value)}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => { onChange(option.value); setOpen(false); }}
          >
            <Text style={[styles.optionText, active && { color: colors.primary, fontWeight: '700' }]}>
              {option.label}
            </Text>
            {active ? <Text style={{ color: colors.primary }}>✓</Text> : null}
          </Pressable>
        );
      })}
      {options.length === 0 && (
        <Text style={styles.emptyOption}>No options available</Text>
      )}
    </ScrollView>
  );

  if (inline) {
    return (
      <Field label={label}>
        <Pressable style={styles.input} onPress={() => setOpen((value) => !value)}>
          <Row>
            <Text style={{ color: selected ? colors.text : colors.textLight, flex: 1, fontSize: 14 }}>
              {selected ? selected.label : placeholder}
            </Text>
            <Text style={{ color: colors.textLight }}>{open ? '▴' : '▾'}</Text>
          </Row>
        </Pressable>
        {open && <View style={styles.inlineOptions}>{rows}</View>}
      </Field>
    );
  }

  return (
    <Field label={label}>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Row>
          <Text style={{ color: selected ? colors.text : colors.textLight, flex: 1, fontSize: 14 }}>
            {selected ? selected.label : placeholder}
          </Text>
          <Text style={{ color: colors.textLight }}>▾</Text>
        </Row>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.pickerCard}>
            <Row style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{label || 'Select'}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </Row>
            {rows}
          </View>
        </View>
      </Modal>
    </Field>
  );
}

export function Chips({ value, options, onChange, style }) {
  return (
    <View style={[styles.chips, style]}>
      {options.map((option) => {
        const active = String(option.value) === String(value);
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ children, tone = 'gray' }) {
  const palette = TONES[tone] || TONES.gray;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

export function StatCard({ title, value, sub, icon, tone = 'blue' }) {
  const palette = TONES[tone] || TONES.blue;
  return (
    <View style={[styles.statCard, { borderColor: palette.border }]}>
      <Row style={{ marginBottom: 6 }}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </Row>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = '📭', title = 'Nothing here yet', sub }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: 8 }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {sub ? <Text style={styles.emptySub}>{sub}</Text> : null}
    </View>
  );
}

export function Loading({ label = 'Loading...' }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.emptySub, { marginTop: 10 }]}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Pager({ page, pages, total, label = 'items', onPageChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <Row style={{ marginTop: spacing.md }}>
      <Button
        title="‹ Prev"
        size="sm"
        variant="ghost"
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      />
      <Text style={styles.pagerText}>
        Page {page} of {pages} · {total} {label}
      </Text>
      <Button
        title="Next ›"
        size="sm"
        variant="ghost"
        disabled={page >= pages}
        onPress={() => onPageChange(page + 1)}
      />
    </Row>
  );
}

export function ModalSheet({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Row style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 36 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 36 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '700' },
  field: { marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  inputFocused: { borderColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  statCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 13,
    flexGrow: 1,
    flexBasis: '47%',
    ...shadow.card,
  },
  statTitle: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statSub: { fontSize: 10, color: colors.textLight, marginTop: 3 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  emptySub: { fontSize: 12, color: colors.textLight, textAlign: 'center', marginTop: 4 },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: '#991b1b', fontSize: 13 },
  pagerText: { fontSize: 11, color: colors.textMuted },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  close: { fontSize: 20, color: colors.textLight, paddingHorizontal: 4 },
  pickerCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '80%',
    marginTop: 'auto',
    overflow: 'hidden',
  },
  pickerHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionActive: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 14, color: colors.text },
  emptyOption: { padding: spacing.lg, color: colors.textLight, fontSize: 13 },
  inlineOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
});
