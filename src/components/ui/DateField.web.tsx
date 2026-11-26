import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Field, useSelectStyle } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import type { DateFieldProps } from './DateField';

/**
 * Versão web: o @react-native-community/datetimepicker não roda no navegador,
 * então usamos o <input type="date"> nativo (o valor já é 'YYYY-MM-DD').
 */
export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const { i18n } = useTranslation();
  const { colors, base } = useTheme();
  const selectStyle = useSelectStyle();
  return (
    <Field label={label} error={error}>
      <View style={[selectStyle, !!error && { borderColor: colors.expense }]}>
        <Icon name="calendar" size={20} color={colors.primary} />
        <input
          type="date"
          aria-label={label}
          lang={i18n.language}
          value={value}
          required
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.ink,
            colorScheme: base,
            minHeight: 48,
          }}
        />
      </View>
    </Field>
  );
}
