// The TV event hook and its event type are missing from the upstream react-native typings.
import {
  useTVEventHandler,
  type HWEvent,
} from '@amazon-devices/react-native-kepler';
import React, {useCallback, useRef} from 'react';
import {ScrollView, StyleSheet, type LayoutChangeEvent} from 'react-native';

import {colors, radii, scale} from '~/shared/ui';

import type {PolicySectionContent} from '../../content';
import {PolicySection} from './PolicySection';
import {nextScrollOffset, SCROLL_STEP} from './scrollStep';

export interface PolicyScrollerProps {
  sections: readonly PolicySectionContent[];
}

/**
 * Focus stays on the action buttons, so ▲/▼ never move focus on this screen;
 * we listen to raw D-pad events and scroll the policy instead.
 */
export const PolicyScroller = ({sections}: PolicyScrollerProps) => {
  const ref = useRef<ScrollView>(null);
  // The source of truth for the position: the TV has no touch scrolling, and
  // onScroll would feed back mid-animation offsets and shorten the next step.
  const offset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);

  const handleKey = useCallback((event: HWEvent) => {
    const next = nextScrollOffset({
      event,
      offset: offset.current,
      step: scale(SCROLL_STEP),
      max: contentHeight.current - viewportHeight.current,
    });
    if (next !== null) {
      offset.current = next;
      ref.current?.scrollTo({y: next, animated: true});
    }
  }, []);
  useTVEventHandler(handleKey);

  return (
    <ScrollView
      ref={ref}
      testID="policy-scroller"
      focusable={false}
      showsVerticalScrollIndicator={false}
      onLayout={(e: LayoutChangeEvent) => {
        viewportHeight.current = e.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_w: number, h: number) => {
        contentHeight.current = h;
      }}
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
