/// <reference types="vite/client" />

interface ElectronAPI {
  sendToPython: (message: string) => void;
  onPythonData: (callback: (data: string) => void) => void;
  removePythonDataListener: () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
