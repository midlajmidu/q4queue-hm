"use client";

import React from "react";
import { useAlert } from "@/context/AlertContext";
import { AlertBanner } from "./AlertBanner";

export const AlertBannerContainer = () => {
  const { alerts, removeAlert } = useAlert();

  if (alerts.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      gap: 12,
      marginBottom: 28,
    }}>
      {alerts.map((alert) => (
        <AlertBanner 
          key={alert.id} 
          alert={alert} 
          onDismiss={removeAlert} 
        />
      ))}
    </div>
  );
};
