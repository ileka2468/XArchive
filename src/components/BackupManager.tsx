import React, { useState, useEffect } from "react";
import { Play, Pause, Trash2 } from "lucide-react";
import { IPCMessage } from "../types/ipc";

interface Backup {
  backupName: string;
  status: string;
  credentials: {
    username: string;
    email?: string;
  };
}

const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [credentials, setCredentials] = useState({
    backupName: Math.random().toString(36).substring(7),
    username: "Jonderon115335",
    email: "",
    password: "Password1234",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load backups from the backend
    window.electronAPI.getMetadata().then((metadata) => {
      const backupList = Object.values(metadata).map((backup: any) => ({
        backupName: backup.backup_name,
        status: backup.status,
        credentials: backup.credentials,
        backupDir: backup.backup_dir,
      }));
      setBackups(backupList);
    });

    // Listen for messages from the Python backend
    window.electronAPI.onPythonData((message: string) => {
      console.log("Received from Python:", message);
      if (message.startsWith("Backup started with name:")) {
        const backupName = message.split(":")[1].trim();
        setBackups((prevBackups) => [
          ...prevBackups,
          {
            backupName,
            status: "Running",
            credentials: {
              username: credentials.username,
              email: credentials.email,
              password: credentials.password,
            },
          },
        ]);
      } else if (message.startsWith("Backup with name")) {
        const backupNameMatch = message.match(/name (\S+) stopped/);
        if (backupNameMatch) {
          const backupName = backupNameMatch[1];
          setBackups((prevBackups) =>
            prevBackups.map((backup) =>
              backup.backupName === backupName
                ? { ...backup, status: "Stopped" }
                : backup
            )
          );
        }
      } else if (message.startsWith("error:")) {
        setError(message.slice(6));
      } else if (message.startsWith("event:")) {
        const parts = message.split(":");
        const backupName = parts[1];
        const eventMessage = parts.slice(2).join(":");
        console.log(`Backup ${backupName} event: ${eventMessage}`);
        // Update backup status if necessary
        setBackups((prevBackups) =>
          prevBackups.map((backup) =>
            backup.backupName === backupName
              ? { ...backup, status: eventMessage }
              : backup
          )
        );
      }
    });

    return () => {
      // Clean up listener when component unmounts
      window.electronAPI.removeAllListeners("python-data");
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleStartBackup = () => {
    // This is actually creating a new backup, not starting a stopped backup rename this to handleCreateBackup
    if (
      !credentials.backupName ||
      !credentials.username ||
      !credentials.password
    ) {
      setError("Backup name, username, and password are required.");
      return;
    }

    setError(null);

    const message: IPCMessage = {
      ipc_type: "action",
      msg: "startBackup",
      backup_name: credentials.backupName,
      credentials: {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      },
    };

    window.electronAPI.sendToPython(message);
    console.log("Starting backup process with name:", credentials.backupName);
  };

  const handleStopBackup = (backupName: string) => {
    const message: IPCMessage = {
      ipc_type: "action",
      msg: "stopBackup",
      backup_name: backupName,
    };
    window.electronAPI.sendToPython(message);
    console.log("Stopping backup with name:", backupName);
  };

  const handleDeleteBackup = (backupName: string) => {
    const message: IPCMessage = {
      ipc_type: "action",
      msg: "deleteBackup",
      backup_name: backupName,
    };
    window.electronAPI.sendToPython(message);
    console.log("Deleting backup with name:", backupName);
    setBackups((prevBackups) =>
      prevBackups.filter((backup) => backup.backupName !== backupName)
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Backup Manager</h2>
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">Create a New Backup</h3>
        {error && <div className="mb-2 text-red-500">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            name="backupName"
            placeholder="Unique Backup Name"
            value={credentials.backupName}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={credentials.username}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
          <input
            type="email"
            name="email"
            placeholder="Email (optional)"
            value={credentials.email}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleInputChange}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={handleStartBackup}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Play />
          Start Backup
        </button>
      </div>
      <h3 className="text-xl font-bold mb-2">Backups</h3>
      {backups.length === 0 ? (
        <div className="text-gray-500">No backups available.</div>
      ) : (
        <ul className="space-y-2">
          {backups.map((backup) => (
            <li
              key={backup.backupName}
              className="flex items-center justify-between bg-gray-100 p-2 rounded"
            >
              <div>
                <span className="font-semibold">Name:</span> {backup.backupName}
                <span className="ml-4 font-semibold">Status:</span>{" "}
                {backup.status}
                <span className="ml-4 font-semibold">User:</span>{" "}
                {backup.credentials.username}
              </div>
              {backup.status !== "Stopped" ? (
                <button
                  onClick={() => handleStopBackup(backup.backupName)}
                  className="bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1"
                >
                  <Pause size={16} />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleStartBackup()} // TODO - create new mwthod to start backup and rename to create backup, start backup is for resuming stopped backups
                  className="bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1"
                >
                  <Play size={16} />
                  Start
                </button>
              )}
              <button
                onClick={() => handleDeleteBackup(backup.backupName)}
                className="bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BackupManager;
