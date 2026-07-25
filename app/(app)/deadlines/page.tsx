export default function DeadlinesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          Deadlines
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Coming soon — this will list every open action item across your
          transcripts, sorted by due date, with overdue items flagged.
        </p>
      </div>
    </main>
  );
}
