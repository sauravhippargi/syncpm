import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

const FEATURES = [
  {
    title: "AI extracts action items automatically",
    description:
      "Upload a meeting transcript and Gemini pulls out tasks, owners, and blockers — no manual note-mining.",
  },
  {
    title: "Real Jira tickets, not a mockup",
    description:
      "Approved action items sync straight into a real Jira Cloud project via the REST API.",
  },
  {
    title: "Nothing ships without your review",
    description:
      "Every extracted item is editable before anything gets created or sent — you're always in the loop.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/upload");
  }

  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      <section className="flex flex-1 flex-col justify-center gap-8 bg-card px-8 py-16 lg:px-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
            SyncPM
          </h1>
          <p className="max-w-md text-[14px] leading-[1.5] text-text-secondary">
            Turns cross-functional meeting transcripts into tracked action
            items, assigned owners, flagged blockers, and real Jira tickets.
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

      <section className="flex flex-1 items-center justify-center bg-page px-6 py-16">
        <AuthForm />
      </section>
    </main>
  );
}
