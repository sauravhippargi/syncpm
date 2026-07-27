"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Connection status (Fathom/Jira) is server-rendered per request, but an
// already-open tab keeps showing whatever it last rendered — so a change made
// in another tab or device (e.g. disconnecting Fathom) leaves this tab stale
// until a manual reload. Mounted once in the (app) layout, this silently
// re-fetches the current route's server render whenever the tab regains
// focus or becomes visible again, so returning to an old tab re-syncs on its
// own. router.refresh() only refetches Server Components (no full reload,
// client state preserved), and no-ops cheaply when nothing changed.
export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
