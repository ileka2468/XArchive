import { useEffect, useState } from "react";
import { Settings } from "../types/settings";

const AppSettings = () => {
  const [syncRate, setSyncRate] = useState(15); // in minutes
  const [autoStart, setAutoStart] = useState(false);
  const [resumeBackups, setResumeBackups] = useState(true);
  const [backupDirectory, setBackupDirectory] = useState(
    "/path/to/default/directory"
  );
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("light");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSettingsSave = async () => {
    // Save settings to local storage
    const settings: Settings = {
      syncRate,
      autoStart,
      resumeBackups,
      backupDirectory,
      notifications,
      language,
      theme,
    };

    const response = await window.electronAPI.saveSettings(settings);
    if (response.success) {
      console.log("Settings saved successfully");
      setSettingsSaved(true);
    } else {
      console.error(response.error);
    }
  };

  useEffect(() => {
    // Load settings from settings.json
    const loadSettings = async () => {
      const response = await window.electronAPI.getSettings();
      if (response.success) {
        console.log("Settings loaded successfully");
        setSyncRate(response.settings.syncRate);
        setAutoStart(response.settings.autoStart);
        setResumeBackups(response.settings.resumeBackups);
        setBackupDirectory(response.settings.backupDirectory);
        setNotifications(response.settings.notifications);
        setLanguage(response.settings.language);
        setTheme(response.settings.theme);
      }
    };

    loadSettings();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Application Settings</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Sync Rate (minutes):
        </label>
        <input
          type="number"
          value={syncRate}
          onChange={(e) => setSyncRate(Number(e.target.value))}
          className="border p-2 rounded w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Auto Start on System Boot:
        </label>
        <input
          type="checkbox"
          checked={autoStart}
          onChange={(e) => setAutoStart(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Resume Backups on Start:
        </label>
        <input
          type="checkbox"
          checked={resumeBackups}
          onChange={(e) => setResumeBackups(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Backups Directory:
        </label>
        <input
          type="text"
          value={backupDirectory}
          onChange={(e) => setBackupDirectory(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Enable Notifications:
        </label>
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Language:
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Theme:
        </label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <button
        onClick={() => handleSettingsSave()}
        className="bg-blue-500 text-white p-2 rounded"
      >
        Save Settings
      </button>
      {settingsSaved && (
        <p className="text-sm text-green-500 mt-2">
          Settings saved, please restart app for changes to take effect.
        </p>
      )}
    </div>
  );
};

export default AppSettings;
