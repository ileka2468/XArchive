import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { dirname } from "path";
import net from "net";
import { PythonShell } from "python-shell";
import { dialog } from "electron";
import path from "path";

let mainWindow;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let ipc_client;
console.log("__dirname", __dirname);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // mainWindow.loadURL("http://localhost:5173"); // Vite dev server
  let isDev = true;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173"); // Vite dev server
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const startBackupProcess = () => {
  const options = {
    scriptPath: path.join(__dirname, "backup_process"),
    pythonOptions: ["-u"], // Unbuffered output
    env: process.env, // Pass environment variables if needed
  };

  const pyshell = new PythonShell("BackupServiceOrchestrator.py", options);

  pyshell.on("message", (message) => {
    console.log(`Python message: ${message}`);
    if (message.includes("Server listening on port")) {
      // Now that the server is ready, initiate the socket connection
      ipc_client = initSocket();
    }
  });

  pyshell.on("stderr", (stderr) => {
    console.error(`Python error: ${stderr}`);
  });

  pyshell.on("error", (err) => {
    console.error("PythonShell error:", err);
    dialog.showErrorBox(
      "Backup Process Error",
      `Failed to start backup process: ${err.message}`
    );
    app.quit();
  });

  pyshell.on("close", () => {
    console.log("PythonShell closed.");
  });
};

const initSocket = () => {
  const client = new net.Socket();

  client.on("error", (error) => {
    console.error("Socket error:", error);
    dialog.showErrorBox(
      "Connection Error",
      `Failed to initialize backup process (Python issues?): ${error.message}`
    );
    app.quit();
  });

  client.on("data", (data) => {
    const message = data.toString();
    console.log(`Received from Python: ${message}`);
    // Send the message to the renderer process
    mainWindow.webContents.send("python-data", message);
  });

  client.connect(12345, "127.0.0.1", () => {
    console.log("Connected to Python server");
  });
  return client;
};

// Handle messages from the renderer process
ipcMain.on("to-python", (event, message) => {
  if (ipc_client) {
    ipc_client.write(message);
    console.log(`Sent to Python: ${message}`);
  } else {
    console.error("IPC client not initialized.");
  }
});

app.on("ready", () => {
  startBackupProcess();
  createWindow();
});

app.on("window-all-closed", () => {
  if (ipc_client) {
    ipc_client.end();
    ipc_client.destroy();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
