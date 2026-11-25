import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          The page you were looking for does not exist or is not available to your account.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
