"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FathomBackfillButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  async function handleClick() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/fathom/backfill", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to sync meetings");
        return;
      }
      // Per-meeting outcomes, not one total (rules.md §2) — a sync where
      // every extraction failed used to read exactly like a clean one.
      const imported: number = data.imported ?? 0;
      const failed: number = data.failed ?? 0;
      const skippedEmpty: number = data.skippedEmpty ?? 0;

      const parts: string[] = [];
      if (imported > 0) parts.push(`Imported ${imported} meeting${imported === 1 ? "" : "s"}`);
      if (failed > 0)
        parts.push(`${failed} extraction${failed === 1 ? "" : "s"} failed`);
      if (skippedEmpty > 0)
        parts.push(`${skippedEmpty} skipped (empty transcript)`);
      setMessage(parts.length > 0 ? parts.join(" · ") : "No new meetings found");

      // Refresh on a failure too — the row is there with its "Extraction
      // failed" badge, and that's the thing worth seeing.
      if (imported > 0 || failed > 0) router.refresh();
    } catch {
      setMessage("Failed to sync meetings — check your connection");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={syncing}
        className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
      >
        {syncing ? "Syncing…" : "Sync recent meetings"}
      </button>
      {message && (
        <span className="text-[12px] text-text-secondary">{message}</span>
      )}
    </div>
  );
}
