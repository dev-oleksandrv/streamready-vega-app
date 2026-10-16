import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text, useDpadScroll} from '~/shared/ui';

import {historyContent as copy} from '../../content';
import type {HistoryEntry} from '../../domain/entry';
import {columns} from './columns';
import {HistoryRow} from './HistoryRow';

export interface HistoryTableProps {
  entries: readonly HistoryEntry[];
  enabled: boolean;
  now: number;
  /** ▲/▼ scroll the rows; off while a dialog is open. */
  scrollable: boolean;
}

const HEADERS = [
  [copy.columns.when, columns.when],
  [copy.columns.download, columns.download],
  [copy.columns.upload, columns.upload],
  [copy.columns.idle, columns.idle],
  [copy.columns.loaded, columns.loaded],
  [copy.columns.grade, columns.grade],
  [copy.columns.ip, columns.ip],
  [copy.columns.country, columns.country],
  [copy.columns.vpn, columns.vpn],
] as const;

/** Column headers over a D-pad-scrolled list; rows are not focusable. */
export const HistoryTable = ({
  entries,
  enabled,
  now,
  scrollable,
}: HistoryTableProps) => {
  const {ref, onLayout, onContentSizeChange} = useDpadScroll(scrollable);
  const empty = entries.length === 0;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        {HEADERS.map(([label, style]) => (
          <Text key={label} style={[styles.headerText, style]}>
            {label}
          </Text>
        ))}
      </View>
      <ScrollView
        ref={ref}
        testID="history-scroller"
        focusable={false}
        showsVerticalScrollIndicator={false}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={[styles.rows, empty && styles.rowsEmpty]}>
        {empty ? (
          <View style={styles.empty}>
            <Text weight="semibold" style={styles.emptyTitle}>
              {copy.empty.title}
            </Text>
            <Text style={styles.emptySub}>
              {enabled ? copy.empty.on : copy.empty.off}
            </Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <HistoryRow
              key={entry.finishedAt}
              entry={entry}
              now={now}
              last={index === entries.length - 1}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: scale(radii.panel),
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(24),
    paddingHorizontal: scale(40),
    borderBottomWidth: scale(2),
    borderBottomColor: colors.border,
  },
  headerText: {fontSize: scale(22), color: colors.textMuted},
  rows: {paddingHorizontal: scale(40)},
  rowsEmpty: {flexGrow: 1},
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(16),
  },
  emptyTitle: {fontSize: scale(40), letterSpacing: scale(-0.8)},
  emptySub: {fontSize: scale(26), color: colors.textMuted},
});
