import TranscriptUploader from "@/components/TranscriptUploader";

export default function UploadPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          Upload a transcript
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Paste a transcript or upload a .txt/.vtt/.srt file to extract action items, owners, and blockers.
        </p>
      </div>
      <TranscriptUploader />
    </main>
  );
}
