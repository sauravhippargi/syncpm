"use client";

import { useEffect, useState } from "react";

// Formats a moment-in-time timestamp (upload time, Jira sync time — as
// opposed to a date-only due date, which is deliberately pinned to UTC
// elsewhere since it's a calendar date, not an instant) using the viewer's
// own browser timezone, not the server's. Renders nothing until after
// mount — both the server-rendered HTML and the client's first hydration
// pass need to match exactly, so the real formatting only ever runs in an
// effect, which executes in the browser alone.
export default function LocalDateTime({ iso }: { iso: string }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: this is the standard client-only-render-after-hydration pattern, see comment above
    setFormatted(new Date(iso).toLocaleString());
  }, [iso]);

  return <>{formatted ?? ""}</>;
}
