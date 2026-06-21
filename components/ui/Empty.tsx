"use client";

import { ReactNode } from "react";
import { FileSearch } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Empty({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-200 bg-white p-10 text-center">
      <div className="text-ink-400">{icon ?? <FileSearch className="h-8 w-8" />}</div>
      <p className="font-medium text-ink-700">{title}</p>
      {description ? <p className="text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}