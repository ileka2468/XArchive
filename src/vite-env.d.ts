/// <reference types="vite/client" />

interface ElectronAPI {
  sendToPython: (message: IpcPayload) => void;
  onPythonData: (callback: (data: string) => void) => void;
  removeAllListeners: (channel: string) => void;
  getBackups: () => Promise<any>;
  getMetadata: () => Promise<any>;
}

type ipc_type = "action" | "activity" | "error";

interface IpcPayload {
  ipc_type: ipc_type;
  msg: any;
}

interface Window {
  electronAPI: ElectronAPI;
}
