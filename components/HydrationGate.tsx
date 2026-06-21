"use client";

import { useEffect, useState } from "react";
import { useDossierStore } from "@/lib/store/dossierStore";

// Prevent flash of empty UI before zustand rehydrates from localStorage.
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useDossierStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-sm text-ink-500">Loading…</div>
      </div>
    );
  }
  return <>{children}</>;
}