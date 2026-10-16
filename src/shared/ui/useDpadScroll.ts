// The TV event hook and its event type are missing from the upstream react-native typings.
import {
  useTVEventHandler,
  type HWEvent,
} from '@amazon-devices/react-native-kepler';
import {useCallback, useRef} from 'react';
import type {LayoutChangeEvent, ScrollView} from 'react-native';

import {scale} from './scale';
import {nextScrollOffset, SCROLL_STEP} from './scrollStep';

export interface DpadScroll {
  ref: React.RefObject<ScrollView | null>;
  onLayout: (event: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
}

/**
 * Scrolls a non-focusable ScrollView with ▲/▼ while focus stays on the
 * screen's buttons. `enabled: false` (e.g. under a dialog) ignores the keys.
 */
export function useDpadScroll(enabled = true): DpadScroll {
  const ref = useRef<ScrollView>(null);
  // The source of truth for the position: the TV has no touch scrolling, and
  // onScroll would feed back mid-animation offsets and shorten the next step.
  const offset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);

  const handleKey = useCallback(
    (event: HWEvent) => {
      if (!enabled) {
        return;
      }
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
    },
    [enabled],
  );
  useTVEventHandler(handleKey);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeight.current = event.nativeEvent.layout.height;
  }, []);

  // Content can shrink (a cleared list); the native view clamps its own
  // offset, so ours follows or the next ▲ would scroll from a stale position.
  const onContentSizeChange = useCallback((_width: number, height: number) => {
    contentHeight.current = height;
    offset.current = Math.min(
      offset.current,
      Math.max(0, height - viewportHeight.current),
    );
  }, []);

  return {ref, onLayout, onContentSizeChange};
}
