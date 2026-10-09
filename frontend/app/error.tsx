"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-zinc-500">
        We could not load this page. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}