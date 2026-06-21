"use client";

import { cn } from "@/lib/utils/cn";

/**
 * "Doss" — the speaking AI presenter. A glowing circular avatar with a rotating
 * conic halo that breathes continuously and runs an equalizer + faster
 * expanding rings while speaking.
 */
export function DossOrb({
  speaking,
  size = 168,
}: {
  speaking: boolean;
  size?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Soft outer bloom — brightens while speaking */}
      <span
        className="absolute -inset-8 rounded-full blur-3xl transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(217,70,239,0.45), rgba(99,102,241,0.25) 45%, transparent 72%)",
          opacity: speaking ? 0.9 : 0.5,
        }}
      />

      {/* Rotating conic halo */}
      <span
        className="spin-slow absolute -inset-4 rounded-full opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, #6366f1, #d946ef, #22d3ee, #a855f7, #6366f1)",
          filter: "blur(16px)",
        }}
      />

      {/* Expanding rings */}
      <span className={cn("orb-ring absolute inset-0 rounded-full bg-brand-400/30", speaking && "orb-ring-fast")} />
      <span
        className={cn("orb-ring absolute inset-0 rounded-full bg-fuchsia-400/25", speaking && "orb-ring-fast")}
        style={{ animationDelay: "0.9s" }}
      />
      <span
        className={cn("orb-ring absolute inset-0 rounded-full bg-cyan-300/20", speaking && "orb-ring-fast")}
        style={{ animationDelay: "1.8s" }}
      />

      {/* Soft inner glow */}
      <span className="absolute inset-3 rounded-full bg-brand-500/40 blur-2xl" />

      {/* Thin rotating ring accent */}
      <span
        className="spin-rev absolute inset-1 rounded-full border border-white/15"
        style={{ borderTopColor: "rgba(255,255,255,0.6)" }}
      />

      {/* Core */}
      <div
        className={cn(
          "orb-breathe relative flex items-center justify-center rounded-full bg-brand-gradient shadow-brand-lg ring-1 ring-white/30",
          speaking && "shadow-[0_0_70px_-2px_rgba(217,70,239,0.85)]"
        )}
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        {/* Glossy highlight */}
        <span className="absolute left-[18%] top-[14%] h-1/3 w-1/3 rounded-full bg-white/45 blur-md" />

        {/* Equalizer */}
        <div className="flex items-end gap-[5px]" style={{ height: size * 0.2 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("eq-bar w-[5px] rounded-full bg-white", !speaking && "!animate-none")}
              style={{
                height: "100%",
                animationDelay: `${i * 0.12}s`,
                animationDuration: `${0.6 + (i % 3) * 0.12}s`,
                transform: speaking ? undefined : "scaleY(0.25)",
                opacity: speaking ? 1 : 0.85,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
