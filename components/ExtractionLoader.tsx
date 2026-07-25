"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading your transcript…",
  "Identifying speakers and owners…",
  "Extracting action items…",
  "Checking for blockers…",
  "Almost done…",
];

const MESSAGE_INTERVAL_MS = 1600;

export default function ExtractionLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Wraps via modulo rather than stopping at the last message, so a
    // slower-than-usual extraction just loops the sequence instead of
    // stalling on "Almost done…" (rules.md — never leave the UI stuck).
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 rounded-[10px] border border-border bg-card px-6 py-10 shadow-card text-center">
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 animate-spin rounded-full"
          style={{
            background:
              "conic-gradient(#635BFF 0deg, #635BFF 90deg, transparent 90deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-accent" />
        </div>
      </div>

      <p
        key={messageIndex}
        className="animate-[fade-in_0.3s_ease-in-out] text-[14px] font-medium leading-[1.4] text-text-primary"
      >
        {MESSAGES[messageIndex]}
      </p>

      <p className="text-[11px] leading-[1.3] text-text-secondary">
        This usually takes a few seconds
      </p>
    </div>
  );
}
