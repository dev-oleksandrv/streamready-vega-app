import React from 'react';
import {StyleSheet, View} from 'react-native';

import {connectionLabel, useInsights, VpnBadge} from '~/modules/insights';
import {colors, radii, scale, Text} from '~/shared/ui';

import {appContent} from '../content';
import {useVisibleConnection, useVisibleVpn} from '../selectors';
import {Wordmark} from './Wordmark';

/** Global top band: brand left; visible insights and network status right. Never focusable. */
export const AppHeader = () => {
  const connection = useVisibleConnection();
  const network = useInsights((s) => s.network);
  const vpnOn = useVisibleVpn();

  return (
    <View style={styles.bar} pointerEvents="none">
      <View style={styles.brand}>
        <Wordmark style={styles.wordmark} />
        <Text style={styles.tagline}>{appContent.tagline}</Text>
      </View>
      <View style={styles.status}>
        {connection ? (
          <>
            {vpnOn ? <VpnBadge /> : null}
            <View style={styles.country}>
              <View style={styles.chip}>
                <Text weight="semibold" style={styles.chipText}>
                  {connection.countryCode}
                </Text>
              </View>
              <Text style={styles.statusText}>{connection.country}</Text>
            </View>
            <Text mono style={styles.ip}>
              {connection.ip}
            </Text>
            <View style={styles.divider} />
          </>
        ) : null}
        <View style={styles.network}>
          <View
            testID="network-dot"
            style={[
              styles.dot,
              {backgroundColor: network.online ? colors.lime : colors.offline},
            ]}
          />
          <Text style={styles.statusText}>{connectionLabel(network)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(132),
    paddingHorizontal: scale(96),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {flexDirection: 'row', alignItems: 'center', gap: scale(18)},
  wordmark: {fontSize: scale(32), letterSpacing: scale(-0.64)},
  tagline: {fontSize: scale(24), color: colors.textMuted},
  status: {flexDirection: 'row', alignItems: 'center', gap: scale(36)},
  statusText: {fontSize: scale(24), color: colors.textSecondary},
  country: {flexDirection: 'row', alignItems: 'center', gap: scale(14)},
  chip: {
    paddingVertical: scale(3),
    paddingHorizontal: scale(9),
    borderRadius: scale(radii.chip),
    borderWidth: scale(2),
    borderColor: colors.borderStrong,
  },
  chipText: {
    fontSize: scale(18),
    letterSpacing: scale(1.08),
    color: colors.textTertiary,
  },
  ip: {fontSize: scale(22), color: colors.textSecondary},
  divider: {width: scale(2), height: scale(28), backgroundColor: colors.border},
  network: {flexDirection: 'row', alignItems: 'center', gap: scale(12)},
  dot: {width: scale(10), height: scale(10), borderRadius: scale(5)},
});
