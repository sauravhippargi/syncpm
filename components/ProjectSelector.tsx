"use client";

import { useEffect, useState } from "react";

interface JiraProject {
  key: string;
  name: string;
}

export default function ProjectSelector({
  initialProjectKey,
}: {
  initialProjectKey: string | null;
}) {
  const [projects, setProjects] = useState<JiraProject[] | null>(null);
  const [selected, setSelected] = useState(initialProjectKey ?? "");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const res = await fetch("/api/integrations/jira/projects");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error || "Failed to load Jira projects");
          return;
        }
        setProjects(data.projects);
      } catch {
        if (!cancelled) setLoadError("Failed to load Jira projects");
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleChange(projectKey: string) {
    setSelected(projectKey);
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/integrations/jira/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save default project");
        return;
      }
      setSaved(true);
    } catch {
      setSaveError("Failed to save default project — check your connection");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="text-[12px] font-medium text-danger">{loadError}</p>;
  }

  if (!projects) {
    return (
      <p className="text-[13px] text-text-secondary">Loading projects…</p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="jira-project"
        className="text-[12px] font-medium text-text-secondary"
      >
        Default project
      </label>
      <select
        id="jira-project"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 w-64 rounded-[6px] border border-border bg-card px-2 text-[13px] text-text-primary outline-none focus:border-accent"
      >
        <option value="" disabled>
          Choose a project…
        </option>
        {projects.map((p) => (
          <option key={p.key} value={p.key}>
            {p.name} ({p.key})
          </option>
        ))}
      </select>
      {saving && (
        <p className="text-[12px] text-text-secondary">Saving…</p>
      )}
      {saved && !saving && (
        <p className="text-[12px] font-medium text-success">Saved</p>
      )}
      {saveError && (
        <p className="text-[12px] font-medium text-danger">{saveError}</p>
      )}
    </div>
  );
}
