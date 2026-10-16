import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';

import {colors, radii, scale, useDpadScroll} from '~/shared/ui';

import type {PolicySectionContent} from '../../content';
import {PolicySection} from './PolicySection';

export interface PolicyScrollerProps {
  sections: readonly PolicySectionContent[];
}

/**
 * Focus stays on the action buttons, so ▲/▼ never move focus on this screen;
 * we listen to raw D-pad events and scroll the policy instead.
 */
export const PolicyScroller = ({sections}: PolicyScrollerProps) => {
  const {ref, onLayout, onContentSizeChange} = useDpadScroll();

  return (
    <ScrollView
      ref={ref}
      testID="policy-scroller"
      focusable={false}
      showsVerticalScrollIndicator={false}
      onLayout={onLayout}
      onContentSizeChange={onContentSizeChange}
      style={styles.panel}
      contentContainerStyle={styles.content}>
      {sections.map((section) => (
        <PolicySection key={section.n} {...section} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  panel: {
    height: scale(852),
    flexGrow: 0,
    borderRadius: scale(radii.panel),
    backgroundColor: colors.surface,
  },
  content: {
    paddingVertical: scale(56),
    paddingHorizontal: scale(64),
    gap: scale(44),
  },
});
