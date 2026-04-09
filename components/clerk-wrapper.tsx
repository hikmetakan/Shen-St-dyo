"use client";

import { useAuth } from "@clerk/nextjs";
import React from "react";

interface ShowProps {
  when: "signed-in" | "signed-out";
  children: React.ReactNode;
}

export const Show: React.FC<ShowProps> = ({ when, children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) return null;

  if (when === "signed-in") {
    return isSignedIn ? <>{children}</> : null;
  }
  if (when === "signed-out") {
    return !isSignedIn ? <>{children}</> : null;
  }
  return null;
};
