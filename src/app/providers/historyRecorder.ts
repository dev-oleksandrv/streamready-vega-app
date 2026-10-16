import type {HistoryStore} from '~/modules/history';
import {deviceProfile, type InsightsStore} from '~/modules/insights';
import type {ConsentStore} from '~/modules/privacy';
import type {SessionStore} from '~/modules/speedtest';

import {
  selectHistoryEntry,
  selectVerdict,
  selectVisibleInsights,
} from '../selectors';

export interface HistoryRecorderStores {
  session: SessionStore;
  insights: InsightsStore;
  consent: ConsentStore;
  history: HistoryStore;
}

/**
 * Saves every finished test with the insights and VPN state of that moment.
 * The history store ignores it while history is off. Returns the unsubscribe.
 */
export function connectHistoryRecorder({
  session,
  insights,
  consent,
  history,
}: HistoryRecorderStores): () => void {
  return session.subscribe((state, prev) => {
    // A new result object appears only when a run finishes.
    if (!state.result || state.result === prev.result) {
      return;
    }
    const {network, device, connection, vpn} = insights.getState();
    history.getState().record(
      selectHistoryEntry({
        result: state.result,
        verdict: selectVerdict(
          state.result,
          network,
          deviceProfile(device?.model),
        ),
        connection: selectVisibleInsights(
          consent.getState().status,
          connection,
        ),
        vpn,
      }),
    );
  });
}
