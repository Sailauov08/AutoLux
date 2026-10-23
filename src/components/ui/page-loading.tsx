// Instant navigation feedback: rendered by loading.tsx while the server streams the page.
export function PageLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" aria-busy="true" className={compact ? "px-6 py-10 md:px-10" : "mx-auto w-full max-w-[1600px] px-6 pt-36 pb-24 md:px-12 md:pt-44"}>
      <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-loading-bar bg-accent" />
      </div>
      <div className="animate-pulse">
        <div className="h-3 w-28 bg-mist" />
        <div className="mt-6 h-12 w-3/4 max-w-xl bg-mist md:h-16" />
        <div className="mt-4 h-4 w-1/2 max-w-md bg-mist" />
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="aspect-[4/3] border border-line bg-card" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
