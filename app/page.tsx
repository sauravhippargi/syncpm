import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

const FEATURES = [
  {
    title: "Action items extracted automatically",
    description:
      "Owners, due dates, and blockers, pulled straight from what was actually said.",
  },
  {
    title: "Connect your meeting recorder once",
    description:
      "Every future meeting imports and gets analyzed automatically — no manual uploads.",
  },
  {
    title: "Approved items become real tickets",
    description:
      "In the tools your team already uses — no copy-pasting into a tracker.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-page px-6 py-12">
      <div className="grid w-full max-w-[1280px] overflow-hidden rounded-[10px] border border-border bg-card shadow-card lg:grid-cols-2">
        <section className="flex flex-col justify-center gap-8 px-8 py-16 lg:px-16">
          <div className="flex flex-col gap-3">
            <Image
              src="/logo-full.png"
              alt="SyncPM"
              width={160}
              height={160}
              priority
            />
            <h1 className="max-w-md text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-text-primary">
              Meeting notes that turn themselves into tracked work
            </h1>
            <p className="max-w-md text-[14px] leading-[1.5] text-text-secondary">
              Upload a transcript — or connect your meeting recorder — and
              SyncPM extracts action items, flags blockers, and turns
              approved items into real tickets.
            </p>
          </div>

          <ul className="flex max-w-md flex-col gap-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex flex-col gap-1">
                <span className="text-[14px] font-medium text-text-primary">
                  {feature.title}
                </span>
                <span className="text-[13px] leading-[1.4] text-text-secondary">
                  {feature.description}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center bg-page px-6 py-16">
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
