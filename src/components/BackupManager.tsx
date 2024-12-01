import React, { useEffect, useState } from "react";
import { Play, Pause, PlusCircle, Trash2 } from "lucide-react";

const BackupManager: React.FC = () => {
  const [backupName, setBackupName] = useState("");
  const [backups, setBackups] = useState<string[]>([]); // Replace with actual data
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    // Listen for data from Python
    window.electronAPI.onPythonData((message: string) => {
      console.log(`Received from Python: ${message}`);
      setStatusMessage(message);
    });

    // Cleanup listener on unmount
    return () => {
      window.electronAPI.removePythonDataListener();
    };
  }, []);

  const handleCreateBackup = () => {
    // Logic to create backup folder and backup.json
    console.log("Creating backup:", backupName);
    setBackups([...backups, backupName]);
    setBackupName("");
  };

  const handleDeleteBackup = (name: string) => {
    // Logic to delete backup folder
    console.log("Deleting backup:", name);
    setBackups(backups.filter((backup) => backup !== name));
  };

  const handleStartBackup = () => {
    window.electronAPI.sendToPython({ ipc_type: "action", msg: "startBackup" });
    console.log("Starting backup process");
  };

  const handleStopBackup = () => {
    window.electronAPI.sendToPython({ ipc_type: "action", msg: "stopBackup" });
    console.log("Stopping backup process");
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Backup Manager</h2>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={backupName}
          onChange={(e) => setBackupName(e.target.value)}
          placeholder="Enter backup name"
          className="border p-2 rounded flex-1"
        />
        <button
          onClick={handleCreateBackup}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <PlusCircle />
          Create Backup
        </button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleStartBackup}
          className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Play />
          Start Backups
        </button>
        <button
          onClick={handleStopBackup}
          className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Pause />
          Stop Backups
        </button>
      </div>
      <h3 className="text-xl font-bold mb-2">Existing Backups</h3>
      <ul className="space-y-2">
        {backups.map((name) => (
          <li
            key={name}
            className="flex items-center justify-between bg-gray-100 p-2 rounded"
          >
            <span>{name}</span>
            <button
              onClick={() => handleDeleteBackup(name)}
              className="bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <p>Status: {statusMessage || "Idle"}</p>
      </div>
    </div>
  );
};

export default BackupManager;
