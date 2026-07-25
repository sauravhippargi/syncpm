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
        setMessage(data.error || "Failed to sync Fathom meetings");
        return;
      }
      const count = data.imported ?? 0;
      setMessage(
        count > 0
          ? `Imported ${count} new meeting${count === 1 ? "" : "s"}`
          : "No new meetings found"
      );
      if (count > 0) router.refresh();
    } catch {
      setMessage("Failed to sync Fathom meetings — check your connection");
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
        {syncing ? "Syncing…" : "Sync recent Fathom meetings"}
      </button>
      {message && (
        <span className="text-[12px] text-text-secondary">{message}</span>
      )}
    </div>
  );
}
