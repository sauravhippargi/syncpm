import Link from "next/link";

export interface DashboardStats {
  openActionItems: number;
  blockers: number;
  completedActionItems: number;
  ticketsRaised: number;
}

export interface RecentTranscriptRow {
  id: string;
  title: string;
  actionItemCount: number;
  blockerCount: number;
  uploadedAtLabel: string;
}

export interface UpcomingDeadlineRow {
  id: string;
  description: string;
  dueDateLabel: string;
  overdue: boolean;
}

// The populated Dashboard layout — stat cards + Recent transcripts/Upcoming
// deadlines columns. Shared verbatim between the real Dashboard (real data)
// and DashboardEmptyState's blurred backdrop preview (sample data), per
// design.md's "Dashboard empty state — blurred backdrop" spec, so the
// preview is never a separate hardcoded mockup that can drift from the
// real layout.
export default function DashboardBody({
  stats,
  recentTranscripts,
  upcomingDeadlines,
}: {
  stats: DashboardStats;
  recentTranscripts: RecentTranscriptRow[];
  upcomingDeadlines: UpcomingDeadlineRow[];
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <StatTile
          label="Open action items"
          value={stats.openActionItems}
          href="/action-items"
        />
        <StatTile label="Blockers" value={stats.blockers} tone="warning" />
        <StatTile
          label="Completed action items"
          value={stats.completedActionItems}
          tone="success"
        />
        <StatTile label="Tickets raised" value={stats.ticketsRaised} tone="jira" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <p className="text-[14px] font-semibold text-text-primary">
            Recent transcripts
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-row-divider">
            {recentTranscripts.map((t) => (
              <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={`/review/${t.id}`} className="group flex flex-col">
                  <span className="mb-1.5 truncate text-[14.5px] font-semibold text-text-primary group-hover:text-accent">
                    {t.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-text-secondary">
                    <span className="inline-flex items-center rounded-full bg-neutral-pill-bg px-2 py-0.5 text-[11.5px] font-semibold text-neutral-pill-text">
                      {t.actionItemCount} action item
                      {t.actionItemCount === 1 ? "" : "s"}
                    </span>
                    {t.blockerCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-warning-tint px-2 py-0.5 text-[11.5px] font-semibold text-warning-text">
                        {t.blockerCount} blocker{t.blockerCount === 1 ? "" : "s"}
                      </span>
                    )}
                    <span>· {t.uploadedAtLabel}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text-primary">
              Upcoming deadlines
            </p>
            <Link
              href="/deadlines"
              className="text-[12px] font-medium text-accent"
            >
              View all
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <p className="mt-3 text-[13px] text-text-secondary">
              No open items with a due date.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-row-divider">
              {upcomingDeadlines.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-[14.5px] font-normal leading-[1.4] text-text-primary">
                    {item.description}
                  </span>
                  <span
                    className={`shrink-0 text-[12.5px] ${
                      item.overdue ? "font-medium text-danger" : "text-text-secondary"
                    }`}
                  >
                    {item.dueDateLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function StatTile({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone?: "warning" | "success" | "jira";
  href?: string;
}) {
  const valueColor =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "jira"
          ? "text-jira-blue"
          : "text-accent";
  const dotColor =
    tone === "warning"
      ? "bg-warning"
      : tone === "success"
        ? "bg-success"
        : tone === "jira"
          ? "bg-jira-blue"
          : "bg-accent";

  const content = (
    <>
      <p
        className={`mb-1.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] ${valueColor}`}
      >
        {value}
      </p>
      <p className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        {label}
      </p>
    </>
  );

  const className =
    "rounded-[10px] border border-border bg-card px-5 pt-5 pb-[18px] shadow-card";

  if (href) {
    return (
      <Link href={href} className={`${className} transition-colors hover:border-accent`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
