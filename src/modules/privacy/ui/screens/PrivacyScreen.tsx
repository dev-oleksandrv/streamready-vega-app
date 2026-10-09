import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {createLogger} from '~/shared/lib/logger';
import {colors, radii, scale, ScreenLayout, Text} from '~/shared/ui';

import {POLICY_SECTIONS, privacyContent} from '../../content';
import type {PrivacyMode} from '../../domain/consent';
import {useConsent, useOnConsentAccepted} from '../ConsentProvider';
import {ConsentActions} from '../components/ConsentActions';
import {PolicyScroller} from '../components/PolicyScroller';

export interface PrivacyScreenProps {
  mode: PrivacyMode;
  /** Called once consent is accepted from the gate. */
  onAccepted: () => void;
  onBack: () => void;
}

const log = createLogger('privacy');

export const PrivacyScreen = ({
  mode,
  onAccepted,
  onBack,
}: PrivacyScreenProps) => {
  const status = useConsent((s) => s.status);
  const accept = useConsent((s) => s.accept);
  const withdraw = useConsent((s) => s.withdraw);
  const onConsentAccepted = useOnConsentAccepted();
  const [accepting, setAccepting] = useState(false);
  // State updates are async; the ref blocks a second press in the same frame.
  const acceptingRef = useRef(false);

  const handleAccept = useCallback(async () => {
    if (acceptingRef.current) {
      return;
    }
    acceptingRef.current = true;
    setAccepting(true);
    try {
      await onConsentAccepted();
    } catch (error) {
      log.warn('accept task failed', error);
    }
    accept();
    onAccepted();
  }, [accept, onAccepted, onConsentAccepted]);

  const handleToggle = useCallback(() => {
    if (status === 'accepted') {
      withdraw();
      return;
    }
    accept();
    onConsentAccepted().catch((error) =>
      log.warn('refresh after consent failed', error),
    );
  }, [accept, onConsentAccepted, status, withdraw]);

  return (
    <ScreenLayout style={styles.grid}>
      <View style={styles.left}>
        <Text weight="medium" style={styles.eyebrow}>
          {privacyContent.eyebrow.toUpperCase()}
        </Text>
        <Text weight="semibold" style={styles.headline}>
          {mode === 'gate'
            ? privacyContent.headline.gate
            : privacyContent.headline.view}
        </Text>
        <Text style={styles.updated}>{privacyContent.lastUpdated}</Text>
        <View style={styles.hintRow}>
          <View style={styles.keys}>
            <Text mono style={styles.keysText}>
              {privacyContent.scrollKeys}
            </Text>
          </View>
          <Text style={styles.hint}>{privacyContent.scrollHint}</Text>
        </View>
        <ConsentActions
          mode={mode}
          status={status}
          accepting={accepting}
          onAccept={handleAccept}
          onToggle={handleToggle}
          onBack={onBack}
        />
      </View>
      <PolicyScroller sections={POLICY_SECTIONS} />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', gap: scale(120)},
  left: {width: scale(620), justifyContent: 'center', gap: scale(36)},
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
  updated: {fontSize: scale(26), color: colors.textMuted},
  hintRow: {flexDirection: 'row', alignItems: 'center', gap: scale(12)},
  keys: {
    paddingVertical: scale(2),
    paddingHorizontal: scale(10),
    borderRadius: scale(radii.chip),
    borderWidth: scale(2),
    borderColor: colors.borderStrong,
  },
  keysText: {fontSize: scale(18), color: colors.textSecondary},
  hint: {fontSize: scale(24), color: colors.textSecondary},
});
