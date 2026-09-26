import { IPINFO_TOKEN } from '@env';

export interface Env {
  ipInfoToken?: string;
}

const optional = (value: string | undefined): string | undefined =>
  value?.trim() || undefined;

export const envVars: Readonly<Env> = Object.freeze({
  ipInfoToken: optional(IPINFO_TOKEN),
});
