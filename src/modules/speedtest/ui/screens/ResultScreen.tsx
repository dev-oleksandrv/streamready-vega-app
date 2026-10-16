import React from 'react';
import {StyleSheet, View} from 'react-native';

import {verdictContent, type Verdict} from '~/modules/verdict';
import {formatMbps, formatMs} from '~/shared/lib/format';
import {colors, FocusButton, scale, ScreenLayout, Text} from '~/shared/ui';

import {testContent} from '../../content';
import type {StartCheck} from '../../domain/canStartTest';
import type {SpeedTestResult} from '../../domain/engine';
import {DownloadCard} from '../components/DownloadCard';
import {StatTile} from '../components/StatTile';
import {StreamCheck} from '../components/StreamCheck';
import {resultEyebrow} from '../resultText';
import {toneColor} from '../toneColor';

const copy = testContent.result;

export interface ResultScreenProps {
  result: SpeedTestResult;
  verdict: Verdict;
  /** Shown in the near-limit note; only read when `verdict.nearDeviceLimit`. */
  deviceLimitMbps?: number;
  now: number;
  /** Test again is greyed unless ok. */
  startCheck: StartCheck;
  /** > 0 appends "in Ns" to Test again. */
  cooldownSeconds: number;
  onTestAgain: () => void;
  /** Home; the Back key does the same via the stack. */
  onBack: () => void;
  onOpenLatency: () => void;
  onOpenHistory: () => void;
}

export const ResultScreen = ({
  result,
  verdict,
  deviceLimitMbps,
  now,
  startCheck,
  cooldownSeconds,
  onTestAgain,
  onBack,
  onOpenLatency,
  onOpenHistory,
}: ResultScreenProps) => {
  const outcome = verdictContent.outcomes[verdict.outcome];
  // 2 × 2 grid, as in the design.
  const checkRows = [verdict.checks.slice(0, 2), verdict.checks.slice(2)];
  const note =
    verdict.nearDeviceLimit && deviceLimitMbps !== undefined
      ? copy.nearLimit(deviceLimitMbps)
      : undefined;

  return (
    <ScreenLayout style={styles.grid}>
      <View style={styles.left}>
        <Text weight="medium" style={styles.eyebrow}>
          {resultEyebrow(result, now).toUpperCase()}
        </Text>
        <View style={styles.verdict}>
          <Text
            weight="semibold"
            style={[styles.headline, {color: toneColor(verdict.tone)}]}>
            {outcome.headline}
          </Text>
          <Text style={styles.sub}>
            {verdictContent.outcomeSub(verdict.outcome, verdict.onWifi)}
          </Text>
        </View>
        <View style={styles.checks}>
          {checkRows.map((row, index) => (
            <View key={index} style={styles.checkRow}>
              {row.map((check) => (
                <StreamCheck
                  key={check.id}
                  label={verdictContent.checks[check.id]}
                  need={verdictContent.needs(check.minMbps)}
                  passed={check.passed}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <FocusButton
            label={
              cooldownSeconds > 0
                ? copy.testAgainIn(cooldownSeconds)
                : copy.testAgain
            }
            variant="primary"
            compact
            minWidth={scale(300)}
            disabled={!startCheck.ok}
            onPress={onTestAgain}
            hasTVPreferredFocus
          />
          <FocusButton label={copy.back} compact onPress={onBack} />
          <FocusButton label={copy.whyItLags} compact onPress={onOpenLatency} />
          <FocusButton label={copy.history} compact onPress={onOpenHistory} />
        </View>
      </View>
      <View style={styles.right}>
        <DownloadCard
          label={copy.download}
          value={formatMbps(result.downloadBps)}
          unit={testContent.units.mbps}
          note={note}
        />
        <View style={styles.tiles}>
          <StatTile
            label={copy.upload}
            value={formatMbps(result.uploadBps)}
            caption={testContent.units.mbps}
          />
          <StatTile
            label={copy.ping}
            value={formatMs(result.idleLatencyMs)}
            caption={copy.msIdle}
          />
          <StatTile
            label={copy.grade}
            value={verdict.grade}
            valueColor={toneColor(verdict.gradeTone)}
            caption={copy.loaded(formatMs(result.loadedLatencyMs))}
          />
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', gap: scale(96)},
  left: {flex: 1, justifyContent: 'center', gap: scale(36)},
  eyebrow: {
    fontSize: scale(26),
    letterSpacing: scale(3.64),
    color: colors.textMuted,
  },
  verdict: {gap: scale(20)},
  headline: {
    fontSize: scale(128),
    lineHeight: scale(125.44),
    letterSpacing: scale(-5.76),
  },
  sub: {
    fontSize: scale(34),
    lineHeight: scale(47.6),
    color: colors.textTertiary,
    maxWidth: scale(900),
  },
  checks: {gap: scale(16), maxWidth: scale(980)},
  checkRow: {flexDirection: 'row', gap: scale(16)},
  actions: {flexDirection: 'row', gap: scale(16), marginTop: scale(8)},
  right: {width: scale(620), justifyContent: 'center', gap: scale(16)},
  tiles: {flexDirection: 'row', gap: scale(16)},
});
