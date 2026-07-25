"use client";

import { useEffect, useState } from "react";
import BrandIcon from "./BrandIcon";
import type { BrandIconSlug } from "@/lib/brand-icons";

interface SourceConnector {
  slug: BrandIconSlug | "otter";
  name: string;
}

// Visual-only placeholders (PRD 6.1) — no real API logic, per rules.md
// section 5. simple-icons has no Otter.ai icon (checked against its full
// icon list, not assumed), so it falls back to a letter monogram.
const CONNECTORS: SourceConnector[] = [
  { slug: "zoom", name: "Zoom" },
  { slug: "otter", name: "Otter.ai" },
  { slug: "googlemeet", name: "Google Meet" },
];

export default function SourceConnectorRow() {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMessage) return;
    const timer = setTimeout(() => setActiveMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [activeMessage]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {CONNECTORS.map((connector) => (
          <button
            key={connector.name}
            type="button"
            onClick={() => setActiveMessage(`${connector.name} — coming soon`)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-2.5 py-1.5 opacity-60 transition-opacity hover:opacity-80"
          >
            {connector.slug === "otter" ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-page text-[10px] font-semibold text-text-secondary">
                O
              </span>
            ) : (
              <BrandIcon slug={connector.slug} className="h-4 w-4" />
            )}
            <span className="text-[12px] font-medium text-text-secondary">
              {connector.name}
            </span>
          </button>
        ))}
        {activeMessage && (
          <span className="rounded-[6px] bg-page px-2 py-1 text-[11px] font-medium text-text-secondary">
            {activeMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-text-secondary">
          or upload manually
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
