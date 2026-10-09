import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-zinc-500">
        The page you are looking for does not exist or you do not have access to it.
      </p>
      <div className="flex gap-3 text-sm font-medium">
        <Link href="/jobs" className="rounded bg-blue-600 px-4 py-2 text-white">
          Browse jobs
        </Link>
        <Link href="/" className="rounded border px-4 py-2">
          Home
        </Link>
      </div>
    </main>
  );
}