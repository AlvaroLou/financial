import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet, Field, useSelectStyle } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { dateToISO, displayDate, isoToDate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import type { ISODate } from '@/types';

export interface DateFieldProps {
  label: string;
  value: ISODate;
  onChange: (iso: ISODate) => void;
  error?: string;
}

/** Campo de data (Android: diálogo nativo · iOS: calendário em bottom sheet). Web: DateField.web.tsx */
export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const { t, i18n } = useTranslation();
  const { colors, base } = useTheme();
  const selectStyle = useSelectStyle();
  const [open, setOpen] = useState(false);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: isoToDate(value),
        mode: 'date',
        onValueChange: (_e, date) => onChange(dateToISO(date)),
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <Field label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayDate(value)}`}
        accessibilityHint={t('common.opensCalendar')}
        onPress={openPicker}
        style={({ pressed }) => [selectStyle, !!error && { borderColor: colors.expense }, pressed && { opacity: 0.8 }]}
      >
        <Icon name="calendar" size={20} color={colors.primary} />
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {displayDate(value)}
        </AppText>
        <Icon name="chevronDown" size={20} color={colors.ink2} />
      </Pressable>

      {Platform.OS !== 'android' ? (
        <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
          <DateTimePicker
            value={isoToDate(value)}
            mode="date"
            display="inline"
            locale={i18n.language}
            accentColor={colors.primary}
            themeVariant={base}
            onValueChange={(_e, date) => onChange(dateToISO(date))}
          />
          <Button label={t('common.done')} onPress={() => setOpen(false)} style={{ marginTop: 8, marginBottom: 8 }} />
        </BottomSheet>
      ) : null}
    </Field>
  );
}
