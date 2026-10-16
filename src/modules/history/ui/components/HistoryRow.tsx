import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {GRADE_TONE, type Tone} from '~/modules/verdict';
import {formatMbps, formatMs} from '~/shared/lib/format';
import {colors, radii, scale, Text} from '~/shared/ui';

import {historyContent as copy} from '../../content';
import type {HistoryEntry} from '../../domain/entry';
import {whenLabel} from '../historyText';
import {columns} from './columns';
import {HistoryValue} from './HistoryValue';

const TONE_COLORS: Readonly<Record<Tone, string>> = {
  good: colors.lime,
  warn: colors.amber,
  bad: colors.coral,
};

export interface HistoryRowProps {
  entry: HistoryEntry;
  now: number;
  /** The last row has no divider below it. */
  last: boolean;
}

/** One saved test. Memoized: up to 50 rows and nothing in them changes. */
export const HistoryRow = memo(function HistoryRow({
  entry,
  now,
  last,
}: HistoryRowProps) {
  const vpnOn = entry.vpn === 'on';
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text numberOfLines={1} style={[styles.when, columns.when]}>
        {whenLabel(entry.finishedAt, now)}
      </Text>
      <HistoryValue
        value={formatMbps(entry.downloadBps)}
        unit={copy.units.mbps}
        style={columns.download}
      />
      <HistoryValue
        value={formatMbps(entry.uploadBps)}
        unit={copy.units.mbps}
        style={columns.upload}
      />
      <HistoryValue
        value={formatMs(entry.idleLatencyMs)}
        unit={copy.units.ms}
        style={columns.idle}
      />
      <HistoryValue
        value={formatMs(entry.loadedLatencyMs)}
        unit={copy.units.ms}
        style={columns.loaded}
      />
      <View style={columns.grade}>
        <View
          testID="history-grade"
          style={[
            styles.grade,
            {backgroundColor: TONE_COLORS[GRADE_TONE[entry.grade]]},
          ]}>
          <Text weight="semibold" style={styles.gradeText}>
            {entry.grade}
          </Text>
        </View>
      </View>
      <Text
        mono
        numberOfLines={1}
        ellipsizeMode="middle"
        style={[styles.ip, columns.ip]}>
        {entry.ip ?? copy.noIp}
      </Text>
      <View style={[styles.country, columns.country]}>
        <View style={styles.chip}>
          <Text weight="semibold" style={styles.chipText}>
            {entry.countryCode ?? copy.noCountryCode}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.countryName}>
          {entry.country ?? copy.noCountry}
        </Text>
      </View>
      <View style={columns.vpn}>
        <View style={[styles.vpn, vpnOn ? styles.vpnOn : styles.vpnOff]}>
          <Text
            weight="semibold"
            style={[styles.vpnText, vpnOn ? styles.vpnTextOn : null]}>
            {copy.vpn[entry.vpn]}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(24),
  },
  divider: {borderBottomWidth: scale(2), borderBottomColor: colors.border},
  when: {fontSize: scale(26), color: colors.textTertiary},
  grade: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(radii.badge),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {fontSize: scale(28), color: colors.onLime},
  ip: {fontSize: scale(24), color: colors.textTertiary},
  country: {flexDirection: 'row', alignItems: 'center', gap: scale(12)},
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
  // Shrinks so a long name ends in "…" inside the column.
  countryName: {flexShrink: 1, fontSize: scale(26)},
  vpn: {
    alignSelf: 'flex-start',
    paddingVertical: scale(6),
    paddingHorizontal: scale(16),
    borderRadius: scale(radii.pill),
    borderWidth: scale(2),
  },
  vpnOn: {borderColor: colors.amberBorder},
  vpnOff: {borderColor: colors.borderStrong},
  vpnText: {
    fontSize: scale(20),
    letterSpacing: scale(0.4),
    color: colors.textMuted,
  },
  vpnTextOn: {color: colors.amber},
});
