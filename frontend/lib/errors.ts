// Backend error shape: { error: { code, message, details?: [{ path, message }] } }
export function extractError(data: unknown, fallback: string): string {
  const e = (data as { error?: { message?: string; details?: { message: string }[] } })?.error;
  if (!e) return fallback;
  if (e.details?.length) return e.details.map((d) => d.message).join('. ');
  return e.message || fallback;
}