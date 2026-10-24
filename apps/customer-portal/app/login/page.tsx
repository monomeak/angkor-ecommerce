import { AuthView } from "@/src/features/auth/views/auth-view";

type LoginPageProps = {
  readonly searchParams: Promise<{ next?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, reason } = await searchParams;

  // Only one known value; anything else in a hand-edited URL is ignored.
  return <AuthView mode="login" next={next} passwordChanged={reason === "password-changed"} />;
}
