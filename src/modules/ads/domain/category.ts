import type {Outcome} from '~/modules/verdict';

import type {AdCategory} from './types';

const CATEGORY: Record<Outcome, AdCategory> = {
  twoUhd: 'good',
  oneUhd: 'good',
  laggy: 'laggy',
  limited: 'limited',
  hdOnly: 'limited',
  buffering: 'limited',
};

/** The result's category, the only result data sent to the ad server. */
export function categoryFor(outcome: Outcome): AdCategory {
  return CATEGORY[outcome];
}
