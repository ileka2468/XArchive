import { useState, useEffect, useMemo } from "react";
import { TwitterBackup } from "./types/twitter";
import { TweetList } from "./components/TweetList";
import { Following } from "./components/Following";
import { SearchBar } from "./components/SearchBar";
import { BookmarkIcon, Heart, RefreshCw } from "lucide-react";
import { validateTwitterBackup } from "./utils/jsonValidator";

function App() {
  const [data, setData] = useState<TwitterBackup | null>(null);
  const [activeTab, setActiveTab] = useState<"likes" | "bookmarks">("likes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const correctPassword = "YellowstonePark";

  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password");
      setPassword("");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          const res = await fetch("/backup.json");
          if (!res.ok) {
            throw new Error("Failed to fetch backup data");
          }
          const text = await res.text();
          let json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            console.error("JSON Parse Error:", e);
            throw new Error("Invalid JSON format");
          }
          const validation = validateTwitterBackup(json);
          if (!validation.valid) {
            throw new Error(
              `Invalid backup format:\n${validation.errors.join("\n")}`
            );
          }
          setData(json);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [isAuthenticated]);

  const filteredTweets = useMemo(() => {
    if (!data) return [];

    const tweets = data[activeTab];
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
  }, [data, activeTab, selectedUser, searchTerm]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Twitter Backup Viewer
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <button
              onClick={() => setActiveTab("likes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center sm:justify-start ${
                activeTab === "likes"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Heart size={20} />
              Likes ({data.likes.length})
            </button>
            <button
              onClick={() => setActiveTab("bookmarks")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center sm:justify-start ${
                activeTab === "bookmarks"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <BookmarkIcon size={20} />
              Bookmarks ({data.bookmarks.length})
            </button>
          </div>
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Following
          following={data.following}
          onSelectUser={setSelectedUser}
          selectedUser={selectedUser}
        />

        <TweetList
          tweets={filteredTweets}
          title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ${
            selectedUser ? `from @${selectedUser}` : ""
          }`}
        />

        <footer className="text-center text-sm text-gray-500 pt-8">
          Last updated: {new Date(data.last_updated).toLocaleString()}
        </footer>
      </main>
    </div>
  );
}

export default App;
