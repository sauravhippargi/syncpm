// Shown while any page inside app/(app) is fetching its data — the layout
// (sidebar) stays mounted, only this content-area placeholder appears, so
// navigation never feels frozen. Same rotating-ring visual as
// ExtractionLoader, without its staged-message cycling — a single static
// label is enough for an ordinary page load.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 animate-spin rounded-full"
          style={{
            background:
              "conic-gradient(#635BFF 0deg, #635BFF 90deg, transparent 90deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-accent" />
        </div>
      </div>
      <p className="text-[14px] font-medium leading-[1.4] text-text-primary">
        Loading…
      </p>
    </div>
  );
}
