const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendToPython: (message) => ipcRenderer.send("send-to-python", message),
  onPythonData: (callback) =>
    ipcRenderer.on("python-data", (event, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  getBackups: () => ipcRenderer.invoke("get-backups"),
  getMetadata: () => ipcRenderer.invoke("get-metadata"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getSettings: () => ipcRenderer.invoke("get-settings"),
});
