import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LitterLink — making communities cleaner, together.
          </p>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/events" className="hover:text-gray-900 transition-colors">
              Browse events
            </Link>
            <Link href="/events/create" className="hover:text-gray-900 transition-colors">
              Host an event
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
