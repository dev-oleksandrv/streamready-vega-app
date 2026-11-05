import type {Logger} from '~/shared/lib/logger';
import {HttpError} from '~/shared/lib/http';

import {toCreative} from '../domain/creative';
import {VastError, type VastErrorCode} from '../domain/errors';
import {expandMacros, type MacroValues} from '../domain/macros';
import type {AdCreative, AdSlot} from '../domain/types';
import {parseVast, type VastDocument} from '../domain/vast';
import {standardMacros} from './standardMacros';

/** Wrappers followed before giving up with VAST error 302. */
export const MAX_WRAPPERS = 3;
export const HOP_TIMEOUT_MS = 1500;
/** One budget for the whole chain, so a slow ad server never holds a slot for long. */
export const TOTAL_TIMEOUT_MS = 3000;
/** VAST documents are a few KB; anything far larger is not worth parsing on a 1 GB stick. */
export const MAX_VAST_CHARS = 256 * 1024;

export type FetchText = (
  url: string,
  opts: {timeoutMs: number; signal?: AbortSignal},
) => Promise<string>;

export interface VastClientDeps {
  fetchText: FetchText;
  now: () => number;
  random?: () => number;
  logger?: Logger;
}

export interface VastRequest {
  tagUrl: string;
  slot: AdSlot;
  /** SR_* values for this request; the client adds CACHEBUSTING and TIMESTAMP. */
  macros: MacroValues;
  signal?: AbortSignal;
}

/** `error` lists the Error trackers to fire with the code; absent when there is nobody to tell. */
export type VastLoadResult =
  | {kind: 'ad'; creative: AdCreative}
  | {kind: 'none'; error?: {code: VastErrorCode; urls: readonly string[]}};

export interface VastClient {
  load(request: VastRequest): Promise<VastLoadResult>;
}

const NONE: VastLoadResult = {kind: 'none'};

function chainErrors(chain: readonly VastDocument[]): string[] {
  return chain.flatMap((d) => (d.kind === 'empty' ? d.errors : d.ad.errors));
}

export function createVastClient({
  fetchText,
  now,
  random = Math.random,
  logger,
}: VastClientDeps): VastClient {
  // Logs carry the slot and a VAST code only: tag and tracker URLs identify the ad account.
  const fail = (
    slot: AdSlot,
    chain: readonly VastDocument[],
    code: VastErrorCode,
    urls: readonly string[] = chainErrors(chain),
  ): VastLoadResult => {
    logger?.debug(`${slot}: no ad (vast ${code})`);
    return {kind: 'none', error: {code, urls}};
  };

  return {
    async load({tagUrl, slot, macros, signal}) {
      const deadline = now() + TOTAL_TIMEOUT_MS;
      const chain: VastDocument[] = [];
      let url = tagUrl;

      for (;;) {
        if (signal?.aborted) {
          return NONE;
        }
        const remaining = deadline - now();
        if (remaining <= 0) {
          return fail(slot, chain, 301);
        }

        let xml: string;
        try {
          const values = {...standardMacros(now(), random), ...macros};
          xml = await fetchText(expandMacros(url, values), {
            timeoutMs: Math.min(HOP_TIMEOUT_MS, remaining),
            signal,
          });
        } catch (error) {
          if (signal?.aborted) {
            return NONE;
          }
          const kind = error instanceof HttpError ? error.kind : 'network';
          if (chain.length === 0) {
            // The tag itself failed: no Error tracker is known yet.
            logger?.debug(`${slot}: ad request failed (${kind})`);
            return NONE;
          }
          return fail(slot, chain, kind === 'timeout' ? 301 : 300);
        }
        if (signal?.aborted) {
          return NONE;
        }

        let doc: VastDocument;
        try {
          if (xml.length > MAX_VAST_CHARS) {
            throw new VastError(100);
          }
          doc = parseVast(xml);
        } catch (error) {
          return fail(
            slot,
            chain,
            error instanceof VastError ? error.code : 900,
          );
        }
        chain.push(doc);

        if (doc.kind === 'wrapper') {
          if (chain.length > MAX_WRAPPERS) {
            return fail(slot, chain, 302);
          }
          url = doc.adTagUri;
          continue;
        }

        const outcome = toCreative(chain, slot);
        if (!outcome.ok) {
          return fail(slot, chain, outcome.code, outcome.errors);
        }
        logger?.debug(`${slot}: ad ready`);
        return {kind: 'ad', creative: outcome.creative};
      }
    },
  };
}
