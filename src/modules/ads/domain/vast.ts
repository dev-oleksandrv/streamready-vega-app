import {XMLParser, XMLValidator} from 'fast-xml-parser';

import {VastError} from './errors';
import {
  TRACKING_EVENTS,
  type MediaFile,
  type Tracking,
  type TrackingEvent,
} from './types';

/** A static image from a NonLinear or a Companion, before any slot rules apply. */
export interface VastImage {
  uri: string;
  creativeType: string;
  width?: number;
  height?: number;
  clickThrough?: string;
  tracking: Tracking;
}

export interface VastLinear {
  /** Absent in wrappers, which only add trackers. */
  durationMs?: number;
  mediaFiles: MediaFile[];
  clickThrough?: string;
  tracking: Tracking;
}

/** What one VAST <Ad> (InLine or Wrapper) says, as plain data. */
export interface VastAd {
  id?: string;
  creativeId?: string;
  title?: string;
  advertiser?: string;
  description?: string;
  impressions: string[];
  errors: string[];
  linear?: VastLinear;
  images: VastImage[];
  /** NonLinearAds-level trackers (creativeView). */
  nonLinearTracking: Tracking;
  /** Raw <DisplayUrl> from the streamready Extension. */
  displayUrl?: string;
}

export type VastDocument =
  | {kind: 'inline'; version: string; ad: VastAd}
  | {kind: 'wrapper'; version: string; adTagUri: string; ad: VastAd}
  | {kind: 'empty'; version: string; errors: string[]};

type XmlNode = {[key: string]: unknown};

// Every element is an array and every text an object, so lookups have one shape.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  alwaysCreateTextNode: true,
  parseTagValue: false,
  parseAttributeValue: false,
  ignoreDeclaration: true,
  isArray: (_name, _path, _leaf, isAttribute) => !isAttribute,
});

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** All elements at `path` below `node`, e.g. `all(ad, 'Creatives', 'Creative')`. */
function all(node: XmlNode | undefined, ...path: string[]): XmlNode[] {
  let nodes = node ? [node] : [];
  for (const name of path) {
    nodes = nodes.flatMap((n) => {
      const value = n[name];
      return Array.isArray(value) ? value.filter(isNode) : [];
    });
  }
  return nodes;
}

function first(node: XmlNode | undefined, ...path: string[]) {
  return all(node, ...path)[0];
}

function text(node: XmlNode | undefined): string | undefined {
  const value = node?.['#text'];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function texts(node: XmlNode | undefined, ...path: string[]): string[] {
  return all(node, ...path)
    .map(text)
    .filter((t): t is string => t !== undefined);
}

function attr(node: XmlNode | undefined, name: string): string | undefined {
  const value = node?.[`@_${name}`];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function positive(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** `HH:MM:SS` or `HH:MM:SS.mmm` → ms. */
export function parseDuration(value: string | undefined): number | undefined {
  const match = value?.match(/^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/);
  if (!match) {
    return undefined;
  }
  const [, h, m, s, frac = '0'] = match;
  return (
    ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 +
    Number(frac.padEnd(3, '0'))
  );
}

function isTrackingEvent(value: string | undefined): value is TrackingEvent {
  return (TRACKING_EVENTS as readonly string[]).includes(value ?? '');
}

function tracking(nodes: XmlNode[]): Tracking {
  const result: Partial<Record<TrackingEvent, string[]>> = {};
  for (const node of all({nodes}, 'nodes', 'TrackingEvents', 'Tracking')) {
    const event = attr(node, 'event');
    const url = text(node);
    if (isTrackingEvent(event) && url) {
      (result[event] ??= []).push(url);
    }
  }
  return result;
}

function mediaFile(node: XmlNode): MediaFile | undefined {
  const uri = text(node);
  if (!uri) {
    return undefined;
  }
  return {
    uri,
    type: attr(node, 'type') ?? '',
    delivery:
      attr(node, 'delivery') === 'streaming' ? 'streaming' : 'progressive',
    width: positive(attr(node, 'width')) ?? 0,
    height: positive(attr(node, 'height')) ?? 0,
    bitrateKbps: positive(attr(node, 'bitrate')),
  };
}

function linear(creatives: XmlNode[]): VastLinear | undefined {
  const node = first({creatives}, 'creatives', 'Linear');
  if (!node) {
    return undefined;
  }
  return {
    durationMs: parseDuration(text(first(node, 'Duration'))),
    mediaFiles: all(node, 'MediaFiles', 'MediaFile')
      .map(mediaFile)
      .filter((f): f is MediaFile => f !== undefined),
    clickThrough: text(first(node, 'VideoClicks', 'ClickThrough')),
    tracking: tracking([node]),
  };
}

function image(
  node: XmlNode,
  clickThroughTag: string,
  trackingNodes: XmlNode[],
): VastImage | undefined {
  const resource = all(node, 'StaticResource').find((r) =>
    attr(r, 'creativeType')?.toLowerCase().startsWith('image/'),
  );
  const uri = text(resource);
  if (!resource || !uri) {
    return undefined;
  }
  return {
    uri,
    creativeType: attr(resource, 'creativeType') ?? '',
    width: positive(attr(node, 'width')),
    height: positive(attr(node, 'height')),
    clickThrough: text(first(node, clickThroughTag)),
    tracking: tracking(trackingNodes),
  };
}

function images(creatives: XmlNode[]): VastImage[] {
  const nonLinear = all(
    {creatives},
    'creatives',
    'NonLinearAds',
    'NonLinear',
  ).map((n) => image(n, 'NonLinearClickThrough', []));
  const companions = all(
    {creatives},
    'creatives',
    'CompanionAds',
    'Companion',
  ).map((n) => image(n, 'CompanionClickThrough', [n]));
  return [...nonLinear, ...companions].filter(
    (i): i is VastImage => i !== undefined,
  );
}

function adData(ad: XmlNode, body: XmlNode): VastAd {
  const creatives = all(body, 'Creatives', 'Creative');
  const extension = all(body, 'Extensions', 'Extension').find(
    (e) => attr(e, 'type') === 'streamready',
  );
  return {
    id: attr(ad, 'id'),
    creativeId: creatives.map((c) => attr(c, 'id')).find(Boolean),
    title: text(first(body, 'AdTitle')),
    advertiser:
      text(first(body, 'Advertiser')) ?? text(first(extension, 'Advertiser')),
    description: text(first(body, 'Description')),
    impressions: texts(body, 'Impression'),
    errors: texts(body, 'Error'),
    linear: linear(creatives),
    images: images(creatives),
    nonLinearTracking: tracking(all({creatives}, 'creatives', 'NonLinearAds')),
    displayUrl: text(first(extension, 'DisplayUrl')),
  };
}

/**
 * Parses one VAST 2/3/4 response. Only the first <Ad> is used: the app shows one ad per slot.
 * Throws VastError 100 (not XML) or 101 (not VAST, or a wrapper without a next URL).
 */
export function parseVast(xml: string): VastDocument {
  if (xml.trim() === '' || XMLValidator.validate(xml) !== true) {
    throw new VastError(100);
  }
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new VastError(100);
  }
  const root = isNode(doc) ? first(doc, 'VAST') : undefined;
  if (!root) {
    throw new VastError(101);
  }
  const version = attr(root, 'version') ?? '';

  for (const ad of all(root, 'Ad')) {
    const inline = first(ad, 'InLine');
    if (inline) {
      return {kind: 'inline', version, ad: adData(ad, inline)};
    }
    const wrapper = first(ad, 'Wrapper');
    if (wrapper) {
      const adTagUri = text(first(wrapper, 'VASTAdTagURI'));
      if (!adTagUri) {
        throw new VastError(101);
      }
      return {kind: 'wrapper', version, adTagUri, ad: adData(ad, wrapper)};
    }
  }
  return {kind: 'empty', version, errors: texts(root, 'Error')};
}
