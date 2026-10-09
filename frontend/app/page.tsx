import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Job Portal</h1>
      <p className="max-w-md text-lg text-zinc-500">
        Find open positions, apply in a few clicks, and track your applications.
      </p>
      <div className="flex gap-3 text-sm font-medium">
        <Link
          href="/jobs"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Browse jobs
        </Link>
        <Link href="/login" className="rounded border px-4 py-2">
          Login
        </Link>
        <Link href="/register" className="rounded border px-4 py-2">
          Register
        </Link>
      </div>
    </main>
  );
}