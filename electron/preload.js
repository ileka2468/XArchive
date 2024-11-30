const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendToPython: (message) => ipcRenderer.send("to-python", message),
  onPythonData: (callback) =>
    ipcRenderer.on("python-data", (event, data) => callback(data)),
  removePythonDataListener: () => ipcRenderer.removeAllListeners("python-data"),
});
