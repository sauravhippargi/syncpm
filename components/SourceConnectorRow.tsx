"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandIcon from "./BrandIcon";
import FathomConnectModal from "./FathomConnectModal";
import type { BrandIconSlug } from "@/lib/brand-icons";

interface PlaceholderConnector {
  slug: BrandIconSlug;
  name: string;
}

// Zoom and Google Meet remain visual-only "Coming soon" placeholders — no
// real API logic, per rules.md section 5. Fathom is the one real
// integration (PRD 6.1), handled separately below.
const PLACEHOLDER_CONNECTORS: PlaceholderConnector[] = [
  { slug: "zoom", name: "Zoom" },
  { slug: "googlemeet", name: "Google Meet" },
];

export default function SourceConnectorRow({
  fathomConnected,
}: {
  fathomConnected: boolean;
}) {
  const router = useRouter();
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!activeMessage) return;
    const timer = setTimeout(() => setActiveMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [activeMessage]);

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-2.5 py-1.5 transition-opacity hover:opacity-80"
        >
          <BrandIcon slug="fathom" className="h-4 w-4" />
          <span className="text-[12px] font-medium text-text-secondary">
            Fathom
          </span>
          {fathomConnected && (
            <span className="rounded-[4px] bg-success-tint px-1.5 py-0.5 text-[10px] font-medium text-success">
              Connected
            </span>
          )}
        </button>

        {PLACEHOLDER_CONNECTORS.map((connector) => (
          <button
            key={connector.name}
            type="button"
            onClick={() => setActiveMessage(`${connector.name} — coming soon`)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-2.5 py-1.5 opacity-60 transition-opacity hover:opacity-80"
          >
            <BrandIcon slug={connector.slug} className="h-4 w-4" />
            <span className="text-[12px] font-medium text-text-secondary">
              {connector.name}
            </span>
          </button>
        ))}
        {activeMessage && (
          <span className="rounded-[6px] bg-neutral-pill-bg px-2 py-1 text-[11px] font-medium text-neutral-pill-text">
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

      {modalOpen && (
        <FathomConnectModal
          connected={fathomConnected}
          onClose={() => setModalOpen(false)}
          onChange={() => router.refresh()}
        />
      )}
    </div>
  );
}
