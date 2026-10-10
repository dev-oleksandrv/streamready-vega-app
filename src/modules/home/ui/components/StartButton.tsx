import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet} from 'react-native';

import type {StartCheck} from '~/modules/speedtest';
import {formatCountdown} from '~/shared/lib/format';
import {colors, focus, radii, resolveFocusLook, scale, Text} from '~/shared/ui';

import {homeContent} from '../../content';
import {PulseRing} from './PulseRing';

export interface StartButtonProps {
  start: StartCheck;
  /** Remaining whole seconds; shown when start.reason is 'cooldown'. */
  cooldownSeconds: number;
  /** Called only when start.ok. */
  onStart: () => void;
}

const copy = homeContent.start;

function hintFor(start: StartCheck): string {
  if (start.ok) {
    return copy.pressOk;
  }
  switch (start.reason) {
    case 'offline':
      return copy.offline;
    case 'consent':
      return copy.consent;
    default:
      return copy.nextTestIn;
  }
}

export const StartButton = ({
  start,
  cooldownSeconds,
  onStart,
}: StartButtonProps) => {
  const [focused, setFocused] = useState(false);
  const ready = start.ok;
  const cooldown = !start.ok && start.reason === 'cooldown';
  const look = resolveFocusLook('primary', focused, !ready);
  const hint = hintFor(start);
  const countdown = formatCountdown(cooldownSeconds);

  // Blocked presses do nothing and focus stays (disabled stays focusable).
  const handlePress = useCallback(() => {
    if (ready) {
      onStart();
    }
  }, [ready, onStart]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.label}
      accessibilityHint={cooldown ? `${hint} ${countdown}` : hint}
      accessibilityState={{disabled: !ready}}
      hasTVPreferredFocus
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={handlePress}
      style={[
        styles.circle,
        {
          borderColor: look.borderColor,
          backgroundColor: look.backgroundColor,
          transform: [{scale: look.scale}],
        },
      ]}>
      {ready && focused ? <PulseRing /> : null}
      {cooldown ? (
        <>
          <Text
            weight="medium"
            style={[styles.nextTestIn, {color: look.textColor}]}>
            {copy.nextTestIn}
          </Text>
          <Text weight="semibold" style={styles.countdown}>
            {countdown}
          </Text>
        </>
      ) : (
        <>
          <Text
            weight="semibold"
            style={[styles.label, {color: look.textColor}]}>
            {copy.label}
          </Text>
          <Text weight="medium" style={[styles.hint, {color: look.textColor}]}>
            {hint}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const SIZE = 480;

const styles = StyleSheet.create({
  circle: {
    width: scale(SIZE),
    height: scale(SIZE),
    borderRadius: scale(radii.pill),
    borderWidth: scale(focus.borderWidth),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(12),
  },
  label: {fontSize: scale(96), letterSpacing: scale(-3.84)},
  hint: {fontSize: scale(26), opacity: 0.7},
  nextTestIn: {fontSize: scale(26)},
  // The countdown stays bright even in the greyed-out cooldown look.
  countdown: {
    fontSize: scale(112),
    letterSpacing: scale(-4.48),
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
