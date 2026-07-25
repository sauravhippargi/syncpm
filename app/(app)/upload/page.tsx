import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TranscriptUploader from "@/components/TranscriptUploader";
import SourceConnectorRow from "@/components/SourceConnectorRow";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const fathomConnection = await prisma.fathomConnection.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Upload a transcript
      </h1>
      <SourceConnectorRow fathomConnected={!!fathomConnection} />
      <TranscriptUploader />
    </main>
  );
}
