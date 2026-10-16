/** Disabled focus ring and the test chart's upload bars share one grey. */
const GREY_500 = '#5C6068';

export const colors = {
  background: '#0B0C0E',
  surface: '#15171B',
  surfaceRaised: '#1A1D22',
  surfaceFocused: '#262A30',
  border: '#22252A',
  borderStrong: '#2A2E34',
  track: '#1F2227',
  /** Upload bars in the test chart. */
  chartMuted: GREY_500,
  text: '#F2F2EE',
  textMuted: '#8E929A',
  textSecondary: '#A4A8AF',
  textTertiary: '#C4C7CC',
  textDisabled: '#6E727A',
  focusDisabled: GREY_500,
  lime: '#C8F560',
  onLime: '#0B0C0E',
  amber: '#FFC24B',
  /** VPN badge fill and border: amber at 12% and 45%. */
  amberSurface: 'rgba(255,194,75,0.12)',
  amberBorder: 'rgba(255,194,75,0.45)',
  coral: '#FF7A66',
  /** Background of a failed stream check. */
  failSurface: '#2A1D1B',
  offline: '#FF4D4D',
  overlay: 'rgba(5,6,8,0.78)',
} as const;

/** Design px; pass through scale() at the use site. */
export const radii = {
  chip: 6,
  /** Grade tile in the history table. */
  badge: 14,
  card: 20,
  tile: 24,
  panel: 28,
  dialog: 36,
  pill: 999,
} as const;

export const focus = {
  borderWidth: 3,
  scale: 1.05,
  disabledScale: 1.03,
} as const;
