// src/components/Sidebar.tsx
import React from "react";
import { FileText, Settings, LayoutDashboard } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (
    tab: "media-viewer" | "backup-manager" | "app-settings"
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => (
  <div className="w-64 h-screen bg-gray-800 text-white flex flex-col">
    <div className="p-4 text-2xl font-bold">Menu</div>
    <nav className="flex-1">
      <ul>
        <li>
          <button
            onClick={() => setActiveTab("media-viewer")}
            className={`flex items-center p-4 w-full text-left ${
              activeTab === "media-viewer" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            <FileText className="mr-2" />
            Media Viewer
          </button>
        </li>
        <li>
          <button
            onClick={() => setActiveTab("backup-manager")}
            className={`flex items-center p-4 w-full text-left ${
              activeTab === "backup-manager"
                ? "bg-gray-700"
                : "hover:bg-gray-700"
            }`}
          >
            <LayoutDashboard className="mr-2" />
            Backup Manager
          </button>
        </li>

        <li>
          <button
            onClick={() => setActiveTab("app-settings")}
            className={`flex items-center p-4 w-full text-left ${
              activeTab === "app-settings" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            <Settings className="mr-2" />
            App Settings
          </button>
        </li>
      </ul>
    </nav>
  </div>
);

export default Sidebar;
