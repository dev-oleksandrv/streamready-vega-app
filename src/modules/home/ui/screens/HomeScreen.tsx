import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {StartCheck} from '~/modules/speedtest';
import {colors, FocusCard, scale, ScreenLayout, Text} from '~/shared/ui';

import {homeContent} from '../../content';
import {StartButton} from '../components/StartButton';

export interface HomeScreenProps {
  start: StartCheck;
  /** Remaining whole seconds; meaningful when start.reason is 'cooldown'. */
  cooldownSeconds: number;
  /** e.g. "Vega OS · Wi‑Fi 5"; built by the route from insights labels. */
  deviceSubtitle: string;
  onStart: () => void;
  onOpenDevice: () => void;
  onOpenPrivacy: () => void;
}

export const HomeScreen = ({
  start,
  cooldownSeconds,
  deviceSubtitle,
  onStart,
  onOpenDevice,
  onOpenPrivacy,
}: HomeScreenProps) => (
  <ScreenLayout style={styles.grid}>
    <View style={styles.hero}>
      <Text weight="medium" style={styles.eyebrow}>
        {homeContent.eyebrow.toUpperCase()}
      </Text>
      <Text weight="semibold" style={styles.headline}>
        {homeContent.headline}
      </Text>
      <Text style={styles.sub}>{homeContent.sub}</Text>
      <View style={styles.cards}>
        <FocusCard
          title={homeContent.deviceCard.title}
          subtitle={deviceSubtitle}
          onPress={onOpenDevice}
        />
        <FocusCard
          title={homeContent.privacyCard.title}
          subtitle={homeContent.privacyCard.subtitle}
          onPress={onOpenPrivacy}
        />
      </View>
    </View>
    <View style={styles.side}>
      <StartButton
        start={start}
        cooldownSeconds={cooldownSeconds}
        onStart={onStart}
      />
    </View>
  </ScreenLayout>
);

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', gap: scale(80)},
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: scale(40),
    paddingBottom: scale(40),
  },
  eyebrow: {
    fontSize: scale(26),
    letterSpacing: scale(3.64),
    color: colors.lime,
  },
  headline: {
    fontSize: scale(136),
    lineHeight: scale(130.6),
    letterSpacing: scale(-6.12),
  },
  sub: {
    fontSize: scale(34),
    lineHeight: scale(47.6),
    color: colors.textSecondary,
    maxWidth: scale(880),
  },
  cards: {flexDirection: 'row', gap: scale(24), marginTop: scale(24)},
  side: {
    width: scale(560),
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: scale(40),
  },
});
