"use client";

import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  ALLOWED_EXTENSIONS,
  MAX_TRANSCRIPT_BYTES,
  extensionFromFilename,
  isAllowedExtension,
} from "@/lib/transcript";
import ExtractionLoader from "./ExtractionLoader";

type Mode = "paste" | "file";

interface UploadError {
  message: string;
  rawOutput?: string;
  transcriptId?: string;
  retryable?: boolean;
}

export default function TranscriptUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("paste");
  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);

  function validateAndSetFile(selected: File) {
    setFile(null);
    setFileError(null);

    const ext = extensionFromFilename(selected.name);
    if (!isAllowedExtension(ext)) {
      setFileError(
        `Unsupported file type — use ${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(", ")}`
      );
      return;
    }
    if (selected.size > MAX_TRANSCRIPT_BYTES) {
      setFileError("File exceeds the 2MB size limit");
      return;
    }
    setFile(selected);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    validateAndSetFile(selected);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  }

  function readFileAsText(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(f);
    });
  }

  async function runExtraction(transcriptId: string) {
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/review/${transcriptId}`);
        return;
      }

      if (data.code === "GEMINI_VALIDATION_FAILED") {
        setError({ message: data.error, rawOutput: data.rawOutput, transcriptId });
      } else {
        setError({
          message: data.error || "Extraction failed — try again",
          transcriptId,
          retryable: true,
        });
      }
    } catch {
      setError({
        message: "Extraction failed — try again",
        transcriptId,
        retryable: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let rawText: string;
    let fileType: string | undefined;

    if (mode === "file") {
      if (!file) {
        setFileError("Choose a transcript file to upload");
        return;
      }
      rawText = await readFileAsText(file);
      fileType = extensionFromFilename(file.name);
    } else {
      rawText = pastedText.trim();
      if (!rawText) {
        setError({ message: "Paste a transcript before submitting" });
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, rawText, fileType }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError({ message: data.error || "Failed to save transcript" });
        setSubmitting(false);
        return;
      }

      await runExtraction(data.id);
    } catch {
      setError({
        message: "Failed to save transcript — check your connection and try again",
      });
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="w-full max-w-xl">
        <ExtractionLoader />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          className="text-[12px] font-medium leading-[1.3] text-text-secondary"
          htmlFor="title"
        >
          Meeting title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Weekly Cross-Functional Sync — Jul 24"
          className="h-8 rounded-[6px] border border-border bg-card px-3 text-[14px] text-text-primary outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-1 rounded-[6px] border border-border bg-card p-1 text-[12px] font-medium">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`flex-1 rounded-[4px] py-1.5 transition-colors ${
            mode === "paste" ? "bg-accent-tint text-accent" : "text-text-secondary"
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex-1 rounded-[4px] py-1.5 transition-colors ${
            mode === "file" ? "bg-accent-tint text-accent" : "text-text-secondary"
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === "paste" ? (
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste the meeting transcript here..."
          rows={12}
          className="rounded-[10px] border border-border bg-card p-3 text-[14px] leading-[1.5] text-text-primary outline-none focus:border-accent"
        />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col gap-2 rounded-[10px] border border-dashed bg-card p-4 transition-colors ${
            isDragOver ? "border-accent" : "border-border"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.vtt,.srt"
            onChange={handleFileChange}
            className="sr-only"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 shrink-0 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary"
            >
              Choose file
            </button>
            <p className="truncate text-[13px] text-text-primary">
              {file
                ? `${file.name} (${Math.ceil(file.size / 1024)} KB)`
                : "No file chosen — or drag one here"}
            </p>
          </div>
          <p className="text-[11px] leading-[1.3] text-text-secondary">
            .txt, .vtt, or .srt — up to 2MB
          </p>
          {fileError && (
            <p className="text-[12px] font-medium leading-[1.3] text-danger">{fileError}</p>
          )}
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-danger-tint bg-danger-tint p-3">
          <p className="text-[13px] font-medium leading-[1.4] text-danger">{error.message}</p>
          {error.rawOutput && (
            <details className="text-[12px] text-text-secondary">
              <summary className="cursor-pointer">Show raw Gemini output</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[6px] bg-card p-2 text-[11px] text-text-primary">
                {error.rawOutput}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            {error.retryable && error.transcriptId && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSubmitting(true);
                  runExtraction(error.transcriptId!);
                }}
                className="h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
              >
                Retry extraction
              </button>
            )}
            {error.transcriptId && (
              <button
                type="button"
                onClick={() => router.push(`/review/${error.transcriptId}`)}
                className="h-8 rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-primary"
              >
                Continue to Review
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        className="h-8 self-start rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
      >
        Extract action items
      </button>
    </form>
  );
}
