"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JiraDisconnectButton() {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/jira/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to disconnect Jira");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to disconnect Jira — check your connection");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="h-8 rounded-[6px] border border-danger-tint px-3 text-[12px] font-medium text-danger disabled:opacity-50"
      >
        {disconnecting ? "Disconnecting…" : "Disconnect"}
      </button>
      {error && <p className="text-[12px] font-medium text-danger">{error}</p>}
    </div>
  );
}
