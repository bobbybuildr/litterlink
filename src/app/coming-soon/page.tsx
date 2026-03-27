import type { Metadata } from "next";
import  Image  from 'next/image'

export const metadata: Metadata = {
  title: "Coming Soon — LitterLink",
  description: "LitterLink is launching soon. Join your community in keeping the UK clean.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 px-4 text-center">
      <div className="flex items-center gap-2 mb-8">
        <Image
          src="/LitterLink_logo-horizontal.png"
          alt="LitterLink"
          width={358}
          height={83}
          priority
          className="h-10 w-auto sm:h-12"
        />
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        Something{" "}
        <span className="text-brand">green</span> is coming.
      </h1>

      <p className="mt-4 max-w-md text-lg text-gray-600">
        We&apos;re building the easiest way to find and organise litter-picking events
        across the UK. Follow our socials to stay updated.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <a
          href="https://www.facebook.com/profile.php?id=61576794153198"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LitterLink on Facebook"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-brand hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>

        <a
          href="https://instagram.com/litterlink_"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LitterLink on Instagram"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-brand hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </a>

        <a
          href="https://x.com/litterlink_"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LitterLink on X"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-brand hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.841L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>

      <p className="mt-12 text-sm text-gray-400">© {new Date().getFullYear()} LitterLink</p>
    </div>
  );
}
