import {useEffect, useRef, useState} from 'react';

import {useInsightsStore} from '~/modules/insights';
import type {ConsentStatus} from '~/modules/privacy';

/**
 * Cold start: once consent has loaded, refresh insights if consent is accepted.
 * Returns true when the splash may hide. refreshConnection never rejects and
 * settles within INSIGHTS_TIMEOUT_MS, so the splash can't hang.
 */
export function useColdStartInsights(
  hydrated: boolean,
  status: ConsentStatus,
): boolean {
  const store = useInsightsStore();
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current) {
      return;
    }
    started.current = true;
    if (status !== 'accepted') {
      setReady(true);
      return;
    }
    store
      .getState()
      .refreshConnection()
      .then(() => setReady(true));
  }, [hydrated, status, store]);

  return ready;
}
