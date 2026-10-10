import {insightsContent as copy} from '../content';
import type {ConnectionInfo} from './connection';
import type {DeviceInfo} from './device';
import type {DeviceProfile} from './deviceLimits';
import {connectionLabel, limitLabel, systemLabel} from './labels';
import type {NetworkStatus} from './network';

export interface DeviceRowData {
  id: string;
  label: string;
  value: string;
}

export interface DeviceRowsInput {
  device?: DeviceInfo;
  profile?: DeviceProfile;
  network: NetworkStatus;
  /** Visible insights only; undefined hides the geo rows. */
  connection?: ConnectionInfo;
  appVersion: string;
}

const rows = copy.device.rows;

/** Design order; a row whose data the platform doesn't give is omitted. */
export function deviceRows({
  device,
  profile,
  network,
  connection,
  appVersion,
}: DeviceRowsInput): DeviceRowData[] {
  const all: Array<[string, string, string | undefined]> = [
    ['model', rows.model, profile?.name ?? device?.model],
    ['system', rows.system, systemLabel(device?.osVersion)],
    ['connection', rows.connection, connectionLabel(network, profile)],
    ['ip', rows.ip, connection?.ip],
    ['country', rows.country, connection?.country],
    ['provider', rows.provider, connection?.isp],
    ['limit', rows.limit, limitLabel(profile)],
    ['appVersion', rows.appVersion, appVersion],
  ];
  return all.flatMap(([id, label, value]) =>
    value ? [{id, label, value}] : [],
  );
}
