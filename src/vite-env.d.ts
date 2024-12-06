/// <reference types="vite/client" />

interface ElectronAPI {
  sendToPython: (message: IpcPayload) => void;
  onPythonData: (callback: (data: string) => void) => void;
  removeAllListeners: (channel: string) => void;
  getBackups: () => Promise<any>;
  getMetadata: () => Promise<any>;
  saveSettings: (settings) => Promise<saveSettingsResponse>;
  getSettings: () => Promise<getSettingsResponse>;
}

type ipc_type = "action" | "activity" | "error";

interface IpcPayload {
  ipc_type: ipc_type;
  msg: any;
}

interface Window {
  electronAPI: ElectronAPI;
}

interface saveSettingsResponse {
  success: boolean;
  error?: string;
}

interface getSettingsResponse {
  success: boolean;
  settings?: Settings;
  error?: string;
}
