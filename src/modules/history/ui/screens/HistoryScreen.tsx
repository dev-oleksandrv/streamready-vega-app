import React, {useCallback, useEffect, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';

import {
  colors,
  FocusButton,
  FocusSwitch,
  radii,
  scale,
  ScreenLayout,
  Text,
} from '~/shared/ui';

import {historyContent as copy} from '../../content';
import {ClearHistoryDialog} from '../components/ClearHistoryDialog';
import {HistoryTable} from '../components/HistoryTable';
import {useHistory} from '../HistoryProvider';

export interface HistoryScreenProps {
  /** For "Today" and "Yesterday"; read once when the screen opens. */
  now: number;
}

/** Back pops the stack (Home or Result); with the dialog open it closes the dialog. */
export const HistoryScreen = ({now}: HistoryScreenProps) => {
  const entries = useHistory((s) => s.entries);
  const enabled = useHistory((s) => s.enabled);
  const setEnabled = useHistory((s) => s.setEnabled);
  const clear = useHistory((s) => s.clear);
  const [confirming, setConfirming] = useState(false);
  // The button that takes focus back when the dialog closes.
  const [focusAfter, setFocusAfter] = useState<'toggle' | 'clear'>('toggle');
  const empty = entries.length === 0;

  const askClear = useCallback(() => setConfirming(true), []);
  const keep = useCallback(() => {
    setFocusAfter('clear');
    setConfirming(false);
  }, []);
  const confirmClear = useCallback(() => {
    clear();
    // Clear history is greyed out now; focus the switch instead.
    setFocusAfter('toggle');
    setConfirming(false);
  }, [clear]);

  useEffect(() => {
    if (!confirming) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        keep();
        return true;
      },
    );
    return () => subscription.remove();
  }, [confirming, keep]);

  return (
    <ScreenLayout style={styles.layout}>
      <View style={styles.top}>
        <View style={styles.titles}>
          <Text weight="medium" style={styles.eyebrow}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Text weight="semibold" style={styles.headline}>
            {copy.headline}
          </Text>
          <View style={styles.info}>
            <Text style={styles.infoText}>{copy.limitNote}</Text>
            <View style={styles.infoDivider} />
            <Text style={[styles.infoText, styles.count]}>
              {copy.count(entries.length)}
            </Text>
            <View style={styles.scrollHint}>
              <View style={styles.keys}>
                <Text mono style={styles.keysText}>
                  {copy.scrollKeys}
                </Text>
              </View>
              <Text style={styles.hint}>{copy.scrollHint}</Text>
            </View>
          </View>
        </View>
        <View style={styles.controls}>
          {enabled ? null : (
            <View style={styles.offNotice}>
              <View style={styles.offDot} />
              <Text style={styles.offText}>{copy.offNotice}</Text>
            </View>
          )}
          <View style={styles.actions}>
            <FocusSwitch
              label={copy.toggle}
              value={enabled}
              onValueChange={setEnabled}
              hasTVPreferredFocus={!confirming && focusAfter === 'toggle'}
            />
            <FocusButton
              label={copy.clear}
              disabled={empty}
              onPress={askClear}
              hasTVPreferredFocus={!confirming && focusAfter === 'clear'}
            />
          </View>
        </View>
      </View>
      <HistoryTable
        entries={entries}
        enabled={enabled}
        now={now}
        scrollable={!confirming}
      />
      <ClearHistoryDialog
        visible={confirming}
        count={entries.length}
        onKeep={keep}
        onClear={confirmClear}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  layout: {gap: scale(40)},
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: scale(60),
    paddingTop: scale(16),
  },
  titles: {gap: scale(20)},
  eyebrow: {
    fontSize: scale(26),
    letterSpacing: scale(3.64),
    color: colors.textMuted,
  },
  headline: {
    fontSize: scale(96),
    lineHeight: scale(96),
    letterSpacing: scale(-4.32),
  },
  info: {flexDirection: 'row', alignItems: 'center', gap: scale(24)},
  infoText: {fontSize: scale(26), color: colors.textSecondary},
  count: {fontVariant: ['tabular-nums']},
  infoDivider: {
    width: scale(2),
    height: scale(24),
    backgroundColor: colors.border,
  },
  scrollHint: {flexDirection: 'row', alignItems: 'center', gap: scale(12)},
  keys: {
    paddingVertical: scale(2),
    paddingHorizontal: scale(10),
    borderRadius: scale(radii.chip),
    borderWidth: scale(2),
    borderColor: colors.borderStrong,
  },
  keysText: {fontSize: scale(18), color: colors.textSecondary},
  hint: {fontSize: scale(24), color: colors.textSecondary},
  controls: {alignItems: 'flex-end', gap: scale(20)},
  offNotice: {flexDirection: 'row', alignItems: 'center', gap: scale(12)},
  offDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: colors.amber,
  },
  offText: {fontSize: scale(24), color: colors.amber},
  actions: {flexDirection: 'row', gap: scale(20)},
});
