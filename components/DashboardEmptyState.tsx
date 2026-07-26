"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import BrandIcon from "./BrandIcon";
import FathomConnectModal from "./FathomConnectModal";
import DashboardBody from "./DashboardBody";

const STEPS = [
  "Add a meeting",
  "Review & approve",
  "Raise a ticket or draft Slack",
];

// Representative sample content for the blurred backdrop preview — plausible
// titles/counts/dates, not zeros or Lorem ipsum, since the point is to show
// what real use looks like (design.md "Dashboard empty state — blurred
// backdrop").
const SAMPLE_STATS = {
  openActionItems: 7,
  blockers: 2,
  completedActionItems: 12,
  ticketsRaised: 5,
};

const SAMPLE_RECENT_TRANSCRIPTS = [
  {
    id: "sample-1",
    title: "Weekly Cross-Functional Sync",
    actionItemCount: 4,
    blockerCount: 1,
    uploadedAtLabel: "Jul 24, 2026, 10:15 AM",
  },
  {
    id: "sample-2",
    title: "Q3 Roadmap Review",
    actionItemCount: 6,
    blockerCount: 0,
    uploadedAtLabel: "Jul 22, 2026, 3:30 PM",
  },
  {
    id: "sample-3",
    title: "Sprint Planning",
    actionItemCount: 3,
    blockerCount: 1,
    uploadedAtLabel: "Jul 21, 2026, 9:00 AM",
  },
];

const SAMPLE_UPCOMING_DEADLINES = [
  {
    id: "sample-a",
    description: "Finish the payments API redesign",
    dueDateLabel: "8/1/2026",
    overdue: false,
  },
  {
    id: "sample-b",
    description: "Follow up with legal on the vendor contract",
    dueDateLabel: "8/3/2026",
    overdue: false,
  },
  {
    id: "sample-c",
    description: "Update the onboarding docs",
    dueDateLabel: "8/5/2026",
    overdue: false,
  },
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
    <div className="relative flex min-h-[60vh] flex-1 flex-col items-center justify-center px-6 py-16">
      {/* Blurred, dimmed preview of the real populated layout — purely
          decorative (design.md "Dashboard empty state — blurred backdrop"):
          sample data only, no fetching, and non-interactive so it can never
          be mistaken for real content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col gap-6 overflow-hidden opacity-[0.55] blur-[5px]"
      >
        <DashboardBody
          stats={SAMPLE_STATS}
          recentTranscripts={SAMPLE_RECENT_TRANSCRIPTS}
          upcomingDeadlines={SAMPLE_UPCOMING_DEADLINES}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 rounded-[10px] bg-card px-8 py-10 text-center shadow-[0_8px_24px_-4px_rgba(50,50,93,.15),0_4px_8px_-2px_rgba(0,0,0,.08)]">
        <h2 className="text-[24px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
          Welcome to SyncPM
        </h2>

        <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-accent bg-card p-6 shadow-card">
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

          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-card p-6 shadow-card">
            <span
              aria-hidden="true"
              className="invisible rounded-[6px] bg-accent px-2 py-0.5 text-[11px] font-medium text-white"
            >
              Recommended
            </span>
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
