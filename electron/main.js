// main.js

import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { dirname } from "path";
import net from "net";
import { PythonShell } from "python-shell";
import { dialog } from "electron";
import path from "path";
import fs from "fs";

let mainWindow;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let ipc_client;
console.log("__dirname", __dirname);

ipcMain.handle("get-metadata", async () => {
  const metadataFile = path.join(__dirname, "metadata.json");
  if (fs.existsSync(metadataFile)) {
    const data = fs.readFileSync(metadataFile, "utf-8");
    return JSON.parse(data);
  }
  return {};
});

ipcMain.handle("get-backups", async () => {
  const backupsFile = path.join(__dirname, "backups.json");
  if (fs.existsSync(backupsFile)) {
    const data = fs.readFileSync(backupsFile, "utf-8");
    return JSON.parse(data);
  }
  return {};
});

ipcMain.on("send-to-python", (event, arg) => {
  console.log("Sending to Python:", arg);
  if (ipc_client && !ipc_client.destroyed) {
    ipc_client.write(JSON.stringify(arg) + "\n");
  } else {
    console.error("Cannot send message, socket is not connected");
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:5173");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  startBackupProcess();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const startBackupProcess = () => {
  const options = {
    scriptPath: path.join(__dirname, "backup_process"),
    pythonOptions: ["-u"],
    env: process.env,
  };

  const pyshell = new PythonShell("BackupServiceOrchestrator.py", options);

  pyshell.on("message", (message) => {
    console.log(`Python message: ${message}`);
    if (message.includes("Server listening on port")) {
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

  client.connect(12345, "localhost", () => {
    console.log("Connected to Python backup process");
  });

  client.on("error", (error) => {
    console.error("Socket error:", error);
    dialog.showErrorBox(
      "Connection Error",
      `Failed to initialize backup process: ${error.message}`
    );
    app.quit();
  });

  let buffer = "";

  client.on("data", (data) => {
    buffer += data.toString();

    // Split the buffer by newline into complete messages
    let messages = buffer.split("\n");

    // Keep the last partial message (if any) in the buffer
    buffer = messages.pop();

    // Process each complete message
    messages.forEach((message) => {
      message = message.trim();
      if (!message) return;

      console.log(`Received from Python: ${message}`);

      // Forward the message to the renderer process
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("python-data", message);
      }

      // Handle metadata-updated messages
      if (message.startsWith("metadata-updated:")) {
        const metadataData = message.slice("metadata-updated:".length).trim();

        try {
          const metadata = JSON.parse(metadataData);
          fs.writeFileSync(
            path.join(__dirname, "metadata.json"),
            JSON.stringify(metadata, null, 2),
            "utf-8"
          );
        } catch (err) {
          console.error("Failed to parse metadata JSON:", err);
        }
      }
    });
  });

  return client;
};
