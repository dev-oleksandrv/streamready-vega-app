import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, FocusButton, scale, Text} from '~/shared/ui';

import {privacyContent} from '../../content';
import type {ConsentStatus, PrivacyMode} from '../../domain/consent';

export interface ConsentActionsProps {
  mode: PrivacyMode;
  status: ConsentStatus;
  accepting: boolean;
  onAccept: () => void;
  onToggle: () => void;
  onBack: () => void;
}

export const ConsentActions = ({
  mode,
  status,
  accepting,
  onAccept,
  onToggle,
  onBack,
}: ConsentActionsProps) => {
  if (mode === 'gate') {
    return (
      <View style={styles.group}>
        <Text style={styles.prompt}>{privacyContent.gatePrompt}</Text>
        <View style={styles.row}>
          <FocusButton
            label={privacyContent.accept}
            variant="primary"
            loading={accepting}
            onPress={onAccept}
            hasTVPreferredFocus
          />
        </View>
      </View>
    );
  }

  const accepted = status === 'accepted';
  return (
    <View style={styles.group}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.dot,
            {backgroundColor: accepted ? colors.lime : colors.coral},
          ]}
        />
        <Text style={styles.status}>
          {accepted
            ? privacyContent.status.accepted
            : privacyContent.status.withdrawn}
        </Text>
      </View>
      <View style={styles.row}>
        <FocusButton
          label={privacyContent.back}
          onPress={onBack}
          hasTVPreferredFocus
        />
        <FocusButton
          label={
            accepted ? privacyContent.withdraw : privacyContent.giveConsent
          }
          onPress={onToggle}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {gap: scale(24)},
  row: {flexDirection: 'row', gap: scale(20)},
  prompt: {
    fontSize: scale(28),
    lineHeight: scale(40.6),
    color: colors.textTertiary,
  },
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: scale(14)},
  dot: {width: scale(12), height: scale(12), borderRadius: scale(6)},
  status: {fontSize: scale(26), color: colors.textTertiary},
});
