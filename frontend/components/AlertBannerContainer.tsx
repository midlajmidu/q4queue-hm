"use client";

import React from "react";
import { useAlert } from "@/context/AlertContext";
import { AlertBanner } from "./AlertBanner";

export const AlertBannerContainer = () => {
  const { alerts, removeAlert } = useAlert();

  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
        overflowX: "hidden",
        pointerEvents: "none",
        /* Hide scrollbar but keep scrollable */
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {alerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onDismiss={removeAlert}
        />
      ))}
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
