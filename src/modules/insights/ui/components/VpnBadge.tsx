import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, ShieldIcon, Text} from '~/shared/ui';

import {insightsContent} from '../../content';

/** Header pill shown while a system VPN is connected. Not focusable. */
export const VpnBadge = () => (
  <View style={styles.badge}>
    <ShieldIcon
      testID="vpn-shield"
      width={scale(20)}
      height={scale(22)}
      color={colors.amber}
    />
    <Text weight="semibold" style={styles.label}>
      {insightsContent.vpnOn}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(6),
    paddingLeft: scale(12),
    paddingRight: scale(16),
    borderRadius: scale(radii.pill),
    borderWidth: scale(2),
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberSurface,
  },
  label: {fontSize: scale(20), letterSpacing: scale(0.4), color: colors.amber},
});
