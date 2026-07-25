export default function JiraHistoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          Jira tickets
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Coming soon — this will log every Jira ticket SyncPM has created,
          with sync status and a link to the real issue.
        </p>
      </div>
    </main>
  );
}
