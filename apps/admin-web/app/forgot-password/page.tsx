import ForgotPasswordForm from "./forgot-password-form";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const params = await searchParams;
  return <ForgotPasswordForm invalidLink={params.reason === "invalid_link"} />;
}
