"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

interface Props {
  tabs: TabItem[];
  initial?: string;
  className?: string;
}

export function Tabs({ tabs, initial, className }: Props) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex gap-1 border-b border-ink-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === t.key
                ? "border-ink-900 text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="py-4">{current?.content}</div>
    </div>
  );
}
