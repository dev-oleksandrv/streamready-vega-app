import type {AdTags} from '~/modules/ads';

import {AD_TAGS as GENERATED} from './adConfig.generated';

/** VAST tag per slot, baked in at build time from .env (ADR 0013). Empty = slot off. */
export const AD_TAGS: AdTags = GENERATED;
