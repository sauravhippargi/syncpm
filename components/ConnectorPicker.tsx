import BrandIcon from "./BrandIcon";
import type { BrandIconSlug } from "@/lib/brand-icons";

interface ConnectorCardProps {
  slug: BrandIconSlug;
  name: string;
  description: string;
}

function ComingSoonCard({ slug, name, description }: ConnectorCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4 opacity-60">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-page">
          <BrandIcon slug={slug} className="h-4 w-4" />
        </span>
        <span className="text-[14px] font-medium text-text-primary">
          {name}
        </span>
        <span className="ml-auto rounded-[6px] bg-page px-2 py-0.5 text-[11px] font-medium text-text-secondary">
          Coming soon
        </span>
      </div>
      <p className="text-[13px] leading-[1.4] text-text-secondary">
        {description}
      </p>
      <button
        type="button"
        disabled
        className="h-8 self-start rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-secondary opacity-50"
      >
        Connect
      </button>
    </div>
  );
}

export default function ConnectorPicker() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-accent-tint">
            <BrandIcon slug="jira" className="h-4 w-4" />
          </span>
          <span className="text-[14px] font-medium text-text-primary">
            Jira
          </span>
        </div>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Connect your own Jira Cloud site — approved action items sync
          straight into a real project.
        </p>
        <a
          href="/api/integrations/jira/connect"
          className="flex h-8 items-center self-start rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
        >
          Connect
        </a>
      </div>

      <ComingSoonCard
        slug="asana"
        name="Asana"
        description="Sync action items into Asana tasks."
      />
      <ComingSoonCard
        slug="linear"
        name="Linear"
        description="Sync action items into Linear issues."
      />
    </div>
  );
}
