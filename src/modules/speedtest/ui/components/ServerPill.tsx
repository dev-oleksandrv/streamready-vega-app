import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text} from '~/shared/ui';

import {testContent as copy} from '../../content';
import type {ServerInfo} from '../../domain/engine';
import {serverName} from '../liveText';
import {BlinkDot} from './BlinkDot';

export interface ServerPillProps {
  server?: ServerInfo;
  /** False once the test stopped: the search dot freezes. */
  blinking: boolean;
}

export const ServerPill = ({server, blinking}: ServerPillProps) => (
  <View style={styles.pill}>
    <BlinkDot
      color={server ? colors.lime : colors.amber}
      blinking={!server && blinking}
      periodMs={800}
    />
    <Text style={styles.label}>
      {server ? copy.server.label : copy.server.finding}
    </Text>
    {server ? (
      <Text weight="medium" style={styles.name}>
        {serverName(server)}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(20),
    paddingVertical: scale(16),
    paddingHorizontal: scale(28),
    borderRadius: scale(radii.pill),
    backgroundColor: colors.surface,
  },
  label: {fontSize: scale(24), color: colors.textMuted},
  name: {fontSize: scale(26)},
});
