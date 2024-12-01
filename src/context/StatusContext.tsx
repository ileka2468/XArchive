import React, { createContext, useState, useContext, useEffect } from "react";

interface StatusContextProps {
  statusMessage: string;
  setStatusMessage: (message: string) => void;
}

const StatusContext = createContext<StatusContextProps | undefined>(undefined);

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    window.electronAPI.onPythonData((message: string) => {
      setStatusMessage(message);
    });

    return () => {
      window.electronAPI.removePythonDataListener();
    };
  }, []);

  return (
    <StatusContext.Provider value={{ statusMessage, setStatusMessage }}>
      {children}
    </StatusContext.Provider>
  );
};

export const useStatus = () => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error("useStatus must be used within a StatusProvider");
  }
  return context;
};
