"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";

export type AlertType = "error" | "warning" | "info" | "success";

export interface AlertAction {
  label: string;
  onClick: () => void;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: Date;
  action?: AlertAction;
  persist?: boolean;
  db?: boolean;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, "id" | "timestamp">) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const addAlert = useCallback((alert: Omit<Alert, "id" | "timestamp">) => {
    // Save alert persistently to backend database (triggers WebSocket sync) if specified
    if (alert.db) {
      api.createMessage(alert.message, alert.type).catch((err) => {
        console.error("Failed to save alert message to database:", err);
      });
    }

    setAlerts((prev) => {
      // Prevent duplicate messages
      if (prev.some((a) => a.message === alert.message)) {
        return prev;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const newAlert: Alert = {
        ...alert,
        id,
        timestamp: new Date(),
      };

      return [newAlert, ...prev];
    });
  }, [removeAlert]);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
    </AlertContext.Provider>
  );
};
