"use client";

import React from "react";
import { AuthProvider } from "@/context/authContext";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}