import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, FocusCard, scale, ScreenLayout, Text} from '~/shared/ui';

import {homeContent} from '../../content';

export interface HomeScreenProps {
  onOpenPrivacy: () => void;
}

// Mock Home for Module 1: Start and the Device card arrive with the speed test.
export const HomeScreen = ({onOpenPrivacy}: HomeScreenProps) => (
  <ScreenLayout>
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
          title={homeContent.privacyCard.title}
          subtitle={homeContent.privacyCard.subtitle}
          onPress={onOpenPrivacy}
          hasTVPreferredFocus
        />
      </View>
    </View>
  </ScreenLayout>
);

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: scale(40),
    paddingBottom: scale(40),
    maxWidth: scale(1184),
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
});
