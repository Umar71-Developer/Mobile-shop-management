import { useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Field } from './UI';
import { colors, radius } from '../theme';
import { formatDate, parseISODate, toLocalISODate } from '../utils/date';

export default function DateField({ label, value, onChange, maximumDate, minimumDate, placeholder = 'Select date' }) {
  const [show, setShow] = useState(false);
  const current = parseISODate(value) || new Date();

  const handleChange = (event, date) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (event?.type === 'dismissed') return;
    if (date) onChange(toLocalISODate(date));
  };

  return (
    <Field label={label}>
      <Pressable style={styles.input} onPress={() => { Keyboard.dismiss(); setShow(true); }}>
        <Text style={{ color: value ? colors.text : colors.textLight, fontSize: 14 }}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {show && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={current}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maximumDate ? parseISODate(maximumDate) || undefined : undefined}
            minimumDate={minimumDate ? parseISODate(minimumDate) || undefined : undefined}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.done} onPress={() => setShow(false)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  pickerWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneText: { color: colors.primary, fontWeight: '700' },
});
