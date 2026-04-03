import Link from "next/link";
import { signUpWithEmail, signInWithGoogle } from "@/app/(auth)/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function SignUpPage({ searchParams }: Props) {
  const { error, message } = await searchParams;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Join LitterLink</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create an account to join or organise litter picks
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Google OAuth */}
        <form action={signInWithGoogle}>
          <FormSubmitButton
            pendingText="Redirecting…"
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </FormSubmitButton>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-gray-50 px-3">or</span>
          </div>
        </div>

        {/* Email sign-up */}
        <form action={signUpWithEmail} className="space-y-4">
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
              Your name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-xs text-gray-400">Minimum 8 characters</p>
          </div>

          {/* Email preferences */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Email preferences
            </legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="event_notifications"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                Event reminders and updates
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="new_nearby_events"
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                Tell me about new events near me
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="newsletter"
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                News and updates from LitterLink
              </label>
            </div>
          </fieldset>

          <FormSubmitButton
            pendingText="Creating account…"
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            Create account
          </FormSubmitButton>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
