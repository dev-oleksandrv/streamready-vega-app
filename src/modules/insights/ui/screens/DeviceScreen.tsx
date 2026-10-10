import React from 'react';
import {StyleSheet, View} from 'react-native';

import {
  colors,
  FocusButton,
  radii,
  scale,
  ScreenLayout,
  Text,
} from '~/shared/ui';

import {insightsContent} from '../../content';
import type {ConnectionInfo} from '../../domain/connection';
import type {DeviceInfo} from '../../domain/device';
import {
  DEVICE_PROFILES,
  deviceProfile,
  type DeviceProfile,
} from '../../domain/deviceLimits';
import {deviceRows} from '../../domain/deviceRows';
import type {NetworkStatus} from '../../domain/network';
import {DeviceRow} from '../components/DeviceRow';

export interface DeviceScreenProps {
  device?: DeviceInfo;
  network: NetworkStatus;
  /** Visible insights only (consent-gated by the app). */
  connection?: ConnectionInfo;
  appVersion: string;
  /** Pops back to Home; the Back key does the same via the stack. */
  onBack: () => void;
  /** Test seam; defaults to the QA-seeded table. */
  profiles?: Readonly<Record<string, DeviceProfile>>;
}

const copy = insightsContent.device;

export const DeviceScreen = ({
  device,
  network,
  connection,
  appVersion,
  onBack,
  profiles = DEVICE_PROFILES,
}: DeviceScreenProps) => {
  const profile = deviceProfile(device?.model, profiles);
  const rows = deviceRows({device, profile, network, connection, appVersion});

  return (
    <ScreenLayout style={styles.grid}>
      <View style={styles.left}>
        <Text weight="medium" style={styles.eyebrow}>
          {copy.eyebrow.toUpperCase()}
        </Text>
        <Text weight="semibold" style={styles.headline}>
          {copy.headline}
        </Text>
        <Text style={styles.sub}>
          {profile ? copy.subKnown(profile.limitMbps) : copy.subUnknown}
        </Text>
        <FocusButton label={copy.back} onPress={onBack} hasTVPreferredFocus />
      </View>
      <View style={styles.panel}>
        {rows.map((row, index) => (
          <DeviceRow
            key={row.id}
            label={row.label}
            value={row.value}
            last={index === rows.length - 1}
          />
        ))}
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', alignItems: 'center', gap: scale(120)},
  left: {flex: 1, gap: scale(36)},
  eyebrow: {
    fontSize: scale(26),
    letterSpacing: scale(3.64),
    color: colors.textMuted,
  },
  headline: {
    fontSize: scale(104),
    lineHeight: scale(104),
    letterSpacing: scale(-4.68),
  },
  sub: {
    fontSize: scale(32),
    lineHeight: scale(46.4),
    color: colors.textTertiary,
    maxWidth: scale(760),
  },
  panel: {
    width: scale(900),
    borderRadius: scale(radii.panel),
    backgroundColor: colors.surface,
    paddingVertical: scale(12),
    paddingHorizontal: scale(44),
  },
});
