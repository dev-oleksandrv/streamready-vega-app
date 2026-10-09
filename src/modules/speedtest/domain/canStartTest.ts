import type {ConsentStatus} from '~/modules/privacy';

export interface StartConditions {
  consent: ConsentStatus;
  online: boolean;
  cooldownUntil?: number;
  now: number;
}

export type StartBlockReason = 'offline' | 'consent' | 'cooldown';

export type StartCheck = {ok: true} | {ok: false; reason: StartBlockReason};

/** Order matters: the first blocking reason is the hint Start shows. */
export function canStartTest({
  consent,
  online,
  cooldownUntil,
  now,
}: StartConditions): StartCheck {
  if (!online) {
    return {ok: false, reason: 'offline'};
  }
  if (consent !== 'accepted') {
    return {ok: false, reason: 'consent'};
  }
  if (cooldownUntil !== undefined && now < cooldownUntil) {
    return {ok: false, reason: 'cooldown'};
  }
  return {ok: true};
}
