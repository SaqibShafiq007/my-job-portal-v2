import AcceptForm from "./AcceptForm";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="p-6 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Accept invitation</h1>
      {token ? (
        <AcceptForm token={token} />
      ) : (
        <p className="text-sm text-red-500">Invitation link is missing its token.</p>
      )}
    </main>
  );
}