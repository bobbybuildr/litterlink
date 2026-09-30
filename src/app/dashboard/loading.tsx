export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only" role="status">Loading your dashboard…</span>
      <div className="animate-pulse">
        <div className="mb-2 sm:mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-56 rounded bg-gray-200" />
            <div className="mt-2 hidden h-4 w-48 rounded bg-gray-100 sm:block" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-lg bg-gray-100" />
            <div className="h-9 w-32 rounded-lg bg-gray-200" />
          </div>
        </div>

        <div className="mb-4 sm:mb-6 h-12 rounded-xl border border-gray-200 bg-white" />

        <section className="mb-12">
          <div className="mb-4 h-6 w-44 rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-12 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {[0, 1].map((section) => (
          <div key={section} className="mb-10">
            <div className="mb-4 h-6 w-36 rounded bg-gray-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-28 rounded-xl border border-gray-200 bg-white shadow-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
