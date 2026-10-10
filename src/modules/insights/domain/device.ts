export interface DeviceInfo {
  /** Platform codename, e.g. "AFTCA001"; undefined when blank or "unknown". */
  model?: string;
  /** e.g. "1.2"; undefined when blank or "unknown". */
  osVersion?: string;
}

export interface DeviceSource {
  load(): Promise<DeviceInfo>;
}
