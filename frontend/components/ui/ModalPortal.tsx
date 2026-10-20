"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  children: React.ReactNode;
  lockScroll?: boolean;
}

// Module-level counter to coordinate body scroll locks across nested/multiple modals
let openModalCount = 0;

export default function ModalPortal({ children, lockScroll = true }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!lockScroll) return;

    openModalCount += 1;
    const prevOverflow = document.body.style.overflow;
    if (openModalCount === 1) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = prevOverflow || "";
      }
    };
  }, [lockScroll]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
