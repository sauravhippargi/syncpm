"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import BrandIcon from "./BrandIcon";
import FathomConnectModal from "./FathomConnectModal";

const STEPS = [
  "Add a meeting",
  "Review & approve",
  "Raise a ticket or draft Slack",
];

// First-time-user welcome (prd.md 6.6) — replaces the stats/lists entirely
// when the signed-in user has zero transcripts, giving them the shape of
// the product before they've done anything.
export default function DashboardEmptyState({
  fathomConnected,
}: {
  fathomConnected: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          Welcome to SyncPM
        </h2>
        <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
          Turn meeting transcripts into tracked action items, owners, and real
          Jira tickets.
        </p>
      </div>

      <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-accent bg-card p-6">
          <span className="rounded-[6px] bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
            Recommended
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-accent-tint">
            <BrandIcon slug="fathom" className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-medium text-text-primary">
              Connect Fathom
            </p>
            <p className="text-[12px] leading-[1.4] text-text-secondary">
              Every new meeting imports and extracts itself automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-1 h-8 w-full rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
          >
            {fathomConnected ? "Manage connection" : "Connect Fathom"}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-card p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-page">
            <Upload size={20} className="text-text-secondary" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-medium text-text-primary">
              Upload a transcript
            </p>
            <p className="text-[12px] leading-[1.4] text-text-secondary">
              Paste text or upload a .txt/.vtt/.srt file manually.
            </p>
          </div>
          <Link
            href="/upload"
            className="mt-1 flex h-8 w-full items-center justify-center rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-primary"
          >
            Upload a transcript
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] text-text-secondary">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">→</span>}
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[11px] font-medium text-accent">
                {i + 1}
              </span>
              <span>{label}</span>
            </div>
          </div>
        ))}
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
