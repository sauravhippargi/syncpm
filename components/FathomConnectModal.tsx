"use client";

import { useEffect, useState } from "react";
import { ClipboardPaste } from "lucide-react";

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
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const [pasteHint, setPasteHint] = useState<string | null>(null);

  useEffect(() => {
    if (!pasteHint) return;
    const timer = setTimeout(() => setPasteHint(null), 3000);
    return () => clearTimeout(timer);
  }, [pasteHint]);

  // Some browsers require a permission prompt, and Safari restricts
  // clipboard reads further (e.g. outside a direct user gesture) — fail
  // quietly with an inline hint rather than a hard error or console noise.
  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard?.readText();
      if (typeof text !== "string") throw new Error("Clipboard unavailable");
      setApiKey(text);
      setPasteHint(null);
    } catch {
      setPasteHint("Couldn't access clipboard — try Cmd/Ctrl+V instead");
    }
  }

  async function handleConnect() {
    // Fathom's dashboard only ever shows the API key once — a pasted
    // whsec_-prefixed value is deterministically a webhook secret, not an
    // API key (confirmed by the whsec_ prefix used in signature
    // verification, lib/fathom.ts), so this is worth catching before an
    // unnecessary round trip to Fathom's API.
    if (apiKey.trim().startsWith("whsec_")) {
      setConnectError(
        "This looks like a webhook secret, not an API key — paste the API key instead. If you don't still have it saved, you'll need to generate a new one in Fathom's settings."
      );
      return;
    }

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
          confirmingDisconnect ? (
            <>
              <p className="text-[13px] leading-[1.4] text-text-secondary">
                Disconnecting removes your stored Fathom connection. To
                reconnect later, you&apos;ll need a valid API key — if you
                don&apos;t still have your original one saved, you&apos;ll
                need to generate a new one in Fathom&apos;s settings
                (regenerating invalidates the old key).
              </p>

              {disconnectError && (
                <p className="text-[12px] font-medium text-danger">{disconnectError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(false)}
                  disabled={busy}
                  className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={busy}
                  className="h-8 rounded-[6px] bg-danger px-3 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-[6px] bg-success-tint px-3 py-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                <span className="text-[13px] font-medium text-success">
                  Connected
                </span>
              </div>

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
                  onClick={() => setConfirmingDisconnect(true)}
                  disabled={busy}
                  className="h-8 rounded-[6px] border border-danger-tint px-3 text-[12px] font-medium text-danger disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </>
          )
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fathom-api-key"
                className="text-[12px] font-medium text-text-secondary"
              >
                Fathom API key
              </label>
              <div className="relative">
                <input
                  id="fathom-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key"
                  className="h-8 w-full rounded-[6px] border border-border bg-card px-3 pr-9 text-[13px] text-text-primary outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  aria-label="Paste from clipboard"
                  className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-text-secondary transition-colors hover:bg-page hover:text-text-primary"
                >
                  <ClipboardPaste size={14} />
                </button>
              </div>
              {pasteHint && (
                <p className="text-[11px] leading-[1.3] text-text-secondary">{pasteHint}</p>
              )}
              <a
                href={FATHOM_API_KEY_SETTINGS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-medium text-accent underline"
              >
                Where do I find this?
              </a>
              <p className="text-[11px] leading-[1.4] text-text-secondary">
                Connected before and disconnected? Fathom can&apos;t show
                your original key again — click Regenerate on that page to
                get a new one.
              </p>
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
