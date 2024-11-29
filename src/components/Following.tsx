import { Users, ChevronDown } from "lucide-react";

interface FollowingProps {
  following?: [string, string][];
  onSelectUser: (username: string | null) => void;
  selectedUser: string | null;
}

export function Following({
  following = [],
  onSelectUser,
  selectedUser,
}: FollowingProps) {
  if (!following?.length) {
    return null;
  }

  return (
    <details
      className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      open
    >
      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">
            Following ({following.length})
          </h2>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" />
      </summary>

      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          {selectedUser && (
            <button
              onClick={() => onSelectUser(null)}
              className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
            >
              Clear Filter
            </button>
          )}
          {following.map(([_, username], index) => (
            <button
              key={`${username}-${index}`}
              onClick={() => onSelectUser(username)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                selectedUser === username
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              @{username}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
