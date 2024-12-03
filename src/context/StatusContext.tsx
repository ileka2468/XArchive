// src/context/StatusContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

interface StatusContextProps {
  statusMessages: { [backupId: string]: string };
}

const StatusContext = createContext<StatusContextProps>({
  statusMessages: {},
});

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [statusMessages, setStatusMessages] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    window.electronAPI.onPythonData((message: string) => {
      if (message.startsWith("event:")) {
        const parts = message.split(":");
        const backupId = parts[1];
        const eventMessage = parts.slice(2).join(":");
        setStatusMessages((prev) => ({
          ...prev,
          [backupId]: eventMessage,
        }));
      }
    });
  }, []);

  return (
    <StatusContext.Provider value={{ statusMessages }}>
      {children}
    </StatusContext.Provider>
  );
};

export const useStatus = () => useContext(StatusContext);
