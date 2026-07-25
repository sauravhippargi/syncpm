"use client";

import { useState } from "react";

const FATHOM_API_KEY_SETTINGS_URL = "https://fathom.video/customize#api-access-header";

export default function FathomConnectModal({
  connected,
  onClose,
  onChange,
}: {
  connected: boolean;
  onClose: () => void;
  onChange: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/integrations/fathom/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectError(data.error || "Failed to connect Fathom");
        return;
      }
      onChange();
      onClose();
    } catch {
      setConnectError("Failed to connect Fathom — check your connection");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/integrations/fathom/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setDisconnectError(data.error || "Failed to disconnect Fathom");
        return;
      }
      onChange();
      onClose();
    } catch {
      setDisconnectError("Failed to disconnect Fathom — check your connection");
    } finally {
      setDisconnecting(false);
    }
  }

  const busy = connecting || disconnecting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[10px] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-medium leading-[1.4] text-text-primary">
            Fathom
          </h2>
          <p className="text-[13px] leading-[1.4] text-text-secondary">
            {connected
              ? "Every new meeting you record in Fathom is automatically imported and run through extraction — no manual upload needed."
              : "Connect your Fathom account to automatically import every new meeting you record."}
          </p>
        </div>

        {connected ? (
          <>
            <div className="flex items-center gap-2 rounded-[6px] bg-success-tint px-3 py-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span className="text-[13px] font-medium text-success">
                Connected
              </span>
            </div>

            {disconnectError && (
              <p className="text-[12px] font-medium text-danger">{disconnectError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={busy}
                className="h-8 rounded-[6px] border border-danger-tint px-3 text-[12px] font-medium text-danger disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fathom-api-key"
                className="text-[12px] font-medium text-text-secondary"
              >
                Fathom API key
              </label>
              <input
                id="fathom-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key"
                className="h-8 rounded-[6px] border border-border bg-card px-3 text-[13px] text-text-primary outline-none focus:border-accent"
              />
              <a
                href={FATHOM_API_KEY_SETTINGS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-medium text-accent underline"
              >
                Where do I find this?
              </a>
            </div>

            {connectError && (
              <p className="text-[12px] font-medium text-danger">{connectError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnect}
                disabled={busy || !apiKey.trim()}
                className="h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {connecting ? "Connecting…" : "Connect"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
