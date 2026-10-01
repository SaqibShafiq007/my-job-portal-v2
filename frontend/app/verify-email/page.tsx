import VerifyEmailForm from "./VerifyEmailForm";
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmailForm initialEmail={email ?? ''} />;
}