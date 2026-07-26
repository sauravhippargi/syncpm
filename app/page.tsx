import Image from "next/image";
import { redirect } from "next/navigation";
import { Plug, ListChecks, Ticket } from "lucide-react";
import { auth } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import BrandIcon from "@/components/BrandIcon";
import type { BrandIconSlug } from "@/lib/brand-icons";

// Only Jira and Fathom are real, live integrations — shown fully colored with
// no badge. The rest are visual "Coming soon" placeholders, matching the
// connector picker / source-connector row treatment. Slack and Notion are
// deliberately absent: neither is real here, and Slack in particular was
// generalized away from tool-specific naming in the Draft Message feature.
const LIVE_LOGOS: { slug: BrandIconSlug; name: string }[] = [
  { slug: "jira", name: "Jira" },
  { slug: "fathom", name: "Fathom" },
];

const COMING_SOON_LOGOS: { slug: BrandIconSlug; name: string }[] = [
  { slug: "asana", name: "Asana" },
  { slug: "linear", name: "Linear" },
  { slug: "zoom", name: "Zoom" },
  { slug: "googlemeet", name: "Google Meet" },
];

const FEATURES = [
  {
    icon: Plug,
    title: "Connect once",
    body: "Link your meeting recorder and every future call imports and gets analyzed automatically.",
  },
  {
    icon: ListChecks,
    title: "Extract and review",
    body: "Owners, due dates, and blockers pulled from what was actually said — you approve before it ships.",
  },
  {
    icon: Ticket,
    title: "Ship to your tracker",
    // Only Jira is functional right now — don't overclaim Linear/Asana.
    body: "Approved items become real tickets in Jira — no copy-pasting.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Sticky nav — logo only */}
      <header className="sticky top-0 z-10 border-b border-border bg-page/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center px-6 py-3">
          <Image
            src="/logo-full.png"
            alt="SyncPM"
            width={44}
            height={44}
            priority
            className="h-11 w-auto"
          />
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section id="signin" className="mx-auto max-w-[1200px] scroll-mt-20 px-6 pb-10 pt-16">
          <div className="grid items-start gap-12 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <h1 className="max-w-xl text-[38px] font-bold leading-[1.15] tracking-[-0.025em] text-text-primary">
                Meeting notes that turn themselves into tracked work
              </h1>
              <p className="mt-5 max-w-[480px] text-[17px] leading-[1.6] text-text-secondary">
                Upload a transcript — or connect your meeting recorder — and
                SyncPM extracts action items, flags blockers, and turns approved
                items into real tickets.
              </p>
              <div className="mt-7">
                <a
                  href="#how"
                  className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-accent"
                >
                  See how it works →
                </a>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <AuthForm />
            </div>
          </div>
        </section>

        {/* Logos strip */}
        <section className="mx-auto max-w-[1200px] border-y border-border px-6 py-8">
          <p className="mb-6 text-center text-[12px] font-medium text-text-secondary">
            Works with the tools your team already uses
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {LIVE_LOGOS.map((logo) => (
              <div key={logo.slug} className="flex items-center gap-2">
                <BrandIcon slug={logo.slug} className="h-5 w-5" />
                <span className="text-[15px] font-medium text-text-primary">
                  {logo.name}
                </span>
              </div>
            ))}
            {COMING_SOON_LOGOS.map((logo) => (
              <div key={logo.slug} className="flex items-center gap-2 opacity-60">
                <BrandIcon slug={logo.slug} className="h-5 w-5" />
                <span className="text-[15px] font-medium text-text-secondary">
                  {logo.name}
                </span>
                <span className="rounded-[6px] bg-neutral-pill-bg px-2 py-0.5 text-[11px] font-medium text-neutral-pill-text">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-6 py-[72px]">
          <div className="mx-auto mb-12 max-w-[560px] text-center">
            <h2 className="text-[30px] font-bold tracking-[-0.02em] text-text-primary">
              From &ldquo;we talked about it&rdquo; to &ldquo;it&apos;s on the
              board&rdquo;
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.6] text-text-secondary">
              Three steps, no manual entry, nothing lost between the call and the
              tracker.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-[10px] border border-border bg-card p-7 shadow-card"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent-tint">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <h3 className="mb-2 text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-[13.5px] leading-[1.6] text-text-secondary">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-[1200px] px-6 pb-[72px]">
          <div className="rounded-[10px] bg-accent-tint px-10 py-14 text-center">
            <h2 className="text-[26px] font-bold tracking-[-0.02em] text-text-primary">
              Ready to stop losing action items?
            </h2>
            <p className="mt-2.5 text-[15px] text-text-secondary">
              Sign in to your workspace, or create a free account in under a
              minute.
            </p>
            <a
              href="#signin"
              className="mt-6 inline-flex h-8 items-center rounded-[6px] bg-accent px-4 text-[12px] font-medium text-white"
            >
              Get started
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mx-auto flex w-full max-w-[1200px] items-center justify-between border-t border-border px-6 py-8">
        <span className="text-[13px] text-text-secondary">© 2026 SyncPM</span>
        <div className="flex gap-6">
          <a href="#" className="text-[13px] font-medium text-text-secondary hover:text-text-primary">
            Privacy
          </a>
          <a href="#" className="text-[13px] font-medium text-text-secondary hover:text-text-primary">
            Terms
          </a>
          <a href="#" className="text-[13px] font-medium text-text-secondary hover:text-text-primary">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
