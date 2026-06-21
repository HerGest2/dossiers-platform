"use client";

import { cn } from "@/lib/utils/cn";
import { HTMLAttributes } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-accent-50 text-accent-700 border-accent-100",
  warning: "bg-warn-50 text-warn-700 border-warn-100",
  danger: "bg-danger-50 text-danger-700 border-danger-100",
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...rest}
    />
  );
}