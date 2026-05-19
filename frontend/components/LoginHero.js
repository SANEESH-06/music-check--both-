import { Headphones } from "lucide-react";

export default function LoginHero() {
  return (
    <section className="login-brand">
      <div className="brand-mark">
        <Headphones size={32} aria-hidden="true" />
      </div>
      <p className="eyebrow">EchoWave Premium</p>
      <h1>Sign in before the music starts.</h1>
      <p>
        High-fidelity playback, futuristic visuals, and a premium studio experience powered by Fastify and MongoDB.
      </p>
    </section>
  );
}
