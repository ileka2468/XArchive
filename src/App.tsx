import { useState, useEffect, useMemo } from "react";
import { TwitterBackup } from "./types/twitter";
import { TweetList } from "./components/TweetList";
import { SearchBar } from "./components/SearchBar";
import { BookmarkIcon, Heart, RefreshCw } from "lucide-react";
import Sidebar from "./components/Sidebar";
import BackupManager from "./components/BackupManager";
import { validateTwitterBackup } from "./utils/jsonValidator";
import AppSettings from "./components/AppSettings";

type ActiveTab = "media-viewer" | "backup-manager" | "app-settings";

function App() {
  const [data, setData] = useState<TwitterBackup | null>(null);
  const [cachedData, setCachedData] = useState<TwitterBackup | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("media-viewer");
  const [subTab, setSubTab] = useState<"likes" | "bookmarks">("likes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // state variables for managing backups
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [selectedBackup, setSelectedBackup] = useState<string>("");

  const correctPassword = "YellowstonePark";

  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password");
      setPassword("");
    }
  };

  const loadData = async (
    backupName: string,
    retryCount = 3,
    retryDelay = 1000
  ) => {
    setLoading(true);
    try {
      const backupFilePath = `/backups/${backupName}/backup.json`;
      const res = await fetch(backupFilePath);
      if (!res.ok) {
        throw new Error("Failed to fetch backup data");
      }
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        if (retryCount > 0) {
          console.log(`Retrying... (${retryCount} attempts left)`);
          setTimeout(
            () => loadData(backupName, retryCount - 1, retryDelay),
            retryDelay
          );
          return;
        } else {
          throw new Error("Failed to parse JSON after multiple attempts");
        }
      }
      const validation = validateTwitterBackup(json);
      if (!validation.valid) {
        throw new Error(
          `Invalid backup format:\n${validation.errors.join("\n")}`
        );
      }
      setData(json);
      setCachedData(json); // Update the cached data
      setRetryCount(0); // Reset retry count on success
      setError(null);
    } catch (err: any) {
      if (retryCount === 0) {
        setError(err.message);
      } else {
        setRetryCount(retryCount - 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Load metadata when authenticated
      window.electronAPI.getMetadata().then((data) => {
        setMetadata(data);
      });

      // Listen for data from Python
      window.electronAPI.onPythonData((message: string) => {
        console.log(`Received from Python: ${message}`);
        if (message.includes("activity:")) {
          if (selectedBackup) {
            loadData(selectedBackup);
          }
        }
        if (message.startsWith("metadata-updated:")) {
          const metadataData = message.slice("metadata-updated:".length);
          const parsedMetadata = JSON.parse(metadataData);
          setMetadata(parsedMetadata);
        }
      });

      return () => {
        // Remove the listener when component unmounts
        window.electronAPI.removeAllListeners("python-data");
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedBackup) {
      loadData(selectedBackup);
    }
  }, [isAuthenticated, selectedBackup]);

  const filteredTweets = useMemo(() => {
    const currentData = data || cachedData; // Use cached data if current data is not available
    if (!currentData) return [];
    const tweets = currentData[subTab];
    return tweets.filter((tweet) => {
      const matchesUser =
        !selectedUser || tweet.user.screen_name === selectedUser;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        tweet.text.toLowerCase().includes(searchLower) ||
        tweet.user.screen_name
          .toLowerCase()
          .includes(searchLower.replace("@", ""));

      return matchesUser && matchesSearch;
    });
  }, [data, cachedData, subTab, selectedUser, searchTerm]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 bg-white shadow-md rounded">
          <h1 className="text-xl font-bold mb-4">Enter Password</h1>
          <input
            type="password"
            className="border p-2 w-full mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handlePasswordSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
          <h2 className="text-xl font-bold text-red-500 mb-2">
            Error Loading Data
          </h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded">
            {error || "Failed to load backup data"}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1">
        {activeTab === "media-viewer" ? (
          <div>
            {/* Backup Selection */}
            <div className="p-4">
              <label htmlFor="backup-select" className="mr-2 font-semibold">
                Select Backup:
              </label>
              <select
                id="backup-select"
                value={selectedBackup}
                onChange={(e) => setSelectedBackup(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="" disabled>
                  Select a backup
                </option>
                {Object.keys(metadata).map((backupName) => (
                  <option key={backupName} value={backupName}>
                    {backupName}
                  </option>
                ))}
              </select>
            </div>
            {selectedBackup ? (
              <>
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                  <div className="max-w-6xl mx-auto px-4 py-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      Backup Viewer - {selectedBackup}
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <button
                        onClick={() => setSubTab("likes")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center sm:justify-start ${
                          subTab === "likes"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <Heart size={20} />
                        Likes ({data?.likes.length || 0})
                      </button>
                      <button
                        onClick={() => setSubTab("bookmarks")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center sm:justify-start ${
                          subTab === "bookmarks"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <BookmarkIcon size={20} />
                        Bookmarks ({data?.bookmarks.length || 0})
                      </button>
                    </div>
                    <SearchBar
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                    />
                  </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                  <TweetList
                    tweets={filteredTweets}
                    title={`${
                      subTab.charAt(0).toUpperCase() + subTab.slice(1)
                    }`}
                  />
                  <footer className="text-center text-sm text-gray-500 pt-8">
                    Last updated:{" "}
                    {new Date(data?.last_updated || 0).toLocaleString()}
                  </footer>
                </main>
              </>
            ) : (
              <div className="p-4">
                <p className="text-center text-gray-600">
                  Please select a backup to view.
                </p>
              </div>
            )}
          </div>
        ) : activeTab === "backup-manager" ? (
          <BackupManager />
        ) : (
          <AppSettings />
        )}
      </div>
    </div>
  );
}

export default App;
