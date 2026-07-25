export default function JiraDisconnectButton() {
  return (
    <form action="/api/integrations/jira/disconnect" method="POST">
      <button
        type="submit"
        className="h-8 rounded-[6px] border border-danger-tint px-3 text-[12px] font-medium text-danger"
      >
        Disconnect
      </button>
    </form>
  );
}
