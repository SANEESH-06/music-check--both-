import LoginForm from "@/components/LoginForm";
import LoginHero from "@/components/LoginHero";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <LoginHero />
      <LoginForm />
    </main>
  );
}
