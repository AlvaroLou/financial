import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { hexToRgb, hslToHex, normalizeHex, rgbToHex } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

/* HSV <-> RGB (o seletor trabalha em HSV: matiz × saturação × brilho) */
interface HSV {
  h: number;
  s: number;
  v: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hexToHsv(hex: string): HSV {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: HSV): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex({ r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 });
}

const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360];

/**
 * Seletor de cor HSV (porte do app de musculação, com gradientes em SVG):
 * área de saturação × brilho, faixa de matiz e campo HEX. A prévia muda
 * enquanto arrasta; a cor é aplicada (`onChange`) ao soltar ou ao digitar um HEX válido.
 */
export function ColorPicker({
  value,
  onChange,
  onInteractStart,
  onInteractEnd,
}: {
  value: string;
  onChange: (hex: string) => void;
  /** início do arraste — use para travar a rolagem da tela */
  onInteractStart?: () => void;
  onInteractEnd?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const [svSize, setSvSize] = useState({ w: 0, h: 0 });
  const [hueW, setHueW] = useState(0);
  const [hexText, setHexText] = useState(value.toUpperCase());

  // sincroniza quando a cor externa muda (ex.: tocar numa cor da grade)
  useEffect(() => {
    if (normalizeHex(value) !== hsvToHex(hsvRef.current)) setHsv(hexToHsv(value));
    setHexText(value.toUpperCase());
  }, [value]);

  const current = hsvToHex(hsv);
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  const handleSv = (e: GestureResponderEvent) => {
    if (svSize.w <= 0 || svSize.h <= 0) return;
    const { locationX, locationY } = e.nativeEvent;
    const s = clamp(locationX / svSize.w, 0, 1);
    const v = 1 - clamp(locationY / svSize.h, 0, 1);
    setHsv((prev) => ({ ...prev, s, v }));
    setHexText(hsvToHex({ ...hsvRef.current, s, v }));
  };

  const handleHue = (e: GestureResponderEvent) => {
    if (hueW <= 0) return;
    const h = clamp(e.nativeEvent.locationX / hueW, 0, 0.9999) * 360;
    setHsv((prev) => ({ ...prev, h }));
    setHexText(hsvToHex({ ...hsvRef.current, h }));
  };

  const commit = () => {
    onChange(hsvToHex(hsvRef.current));
    onInteractEnd?.();
  };

  const responder = (handler: (e: GestureResponderEvent) => void) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      onInteractStart?.();
      handler(e);
    },
    onResponderMove: handler,
    onResponderRelease: commit,
    onResponderTerminate: commit,
    onResponderTerminationRequest: () => false,
  });

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.sv, { backgroundColor: hueHex }]}
        onLayout={(e: LayoutChangeEvent) => setSvSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        accessibilityLabel={t('appearance.pickerA11y')}
        {...responder(handleSv)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`w${gid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000000" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#w${gid})`} />
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#b${gid})`} />
          </Svg>
        </View>
        <View
          pointerEvents="none"
          style={[styles.svThumb, { left: hsv.s * svSize.w - 10, top: (1 - hsv.v) * svSize.h - 10, backgroundColor: current }]}
        />
      </View>

      <View style={styles.hue} onLayout={(e) => setHueW(e.nativeEvent.layout.width)} {...responder(handleHue)}>
        <View style={styles.hueBar} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`h${gid}`} x1="0" y1="0" x2="1" y2="0">
                {HUE_STOPS.map((h) => (
                  <Stop key={h} offset={String(h / 360)} stopColor={hslToHex(h, 1, 0.5)} stopOpacity="1" />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" rx="7" fill={`url(#h${gid})`} />
          </Svg>
        </View>
        <View pointerEvents="none" style={[styles.hueThumb, { left: (hsv.h / 360) * hueW - 10, backgroundColor: hueHex }]} />
      </View>

      <View style={styles.readout}>
        <View style={[styles.preview, { backgroundColor: current, borderColor: colors.outline }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={colors.ink2}>
            HEX
          </AppText>
          <TextInput
            value={hexText}
            onChangeText={(text) => {
              setHexText(text.toUpperCase());
              const hex = normalizeHex(text);
              if (hex && hex.length === 7 && text.replace('#', '').length === 6) {
                setHsv(hexToHsv(hex));
                onChange(hex);
              }
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            accessibilityLabel={t('appearance.hexA11y')}
            style={[styles.hexInput, { color: colors.ink, borderColor: colors.outline, backgroundColor: colors.surface }]}
          />
        </View>
      </View>
      <AppText variant="caption" color={colors.ink2}>
        {t('appearance.pickerHint')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  sv: { width: '100%', aspectRatio: 1.7, borderRadius: radius.md, overflow: 'hidden' },
  svThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  hue: { height: 28, justifyContent: 'center' },
  hueBar: { height: 14, borderRadius: 7, overflow: 'hidden' },
  hueThumb: {
    position: 'absolute',
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  readout: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1 },
  hexInput: {
    minHeight: 40,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 1,
  },
});
