export const colors = {
  background: '#0B0C0E',
  surface: '#15171B',
  surfaceRaised: '#1A1D22',
  surfaceFocused: '#262A30',
  border: '#22252A',
  borderStrong: '#2A2E34',
  track: '#1F2227',
  text: '#F2F2EE',
  textMuted: '#8E929A',
  textSecondary: '#A4A8AF',
  textTertiary: '#C4C7CC',
  textDisabled: '#6E727A',
  focusDisabled: '#5C6068',
  lime: '#C8F560',
  onLime: '#0B0C0E',
  amber: '#FFC24B',
  coral: '#FF7A66',
  offline: '#FF4D4D',
  overlay: 'rgba(5,6,8,0.78)',
} as const;

/** Design px; pass through scale() at the use site. */
export const radii = {
  chip: 6,
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
