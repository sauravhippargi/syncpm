import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          SyncPM
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Meeting transcripts in, tracked action items and Jira tickets out.
        </p>
      </div>
      <Link
        href="/upload"
        className="flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
      >
        Upload a transcript
      </Link>
    </main>
  );
}
