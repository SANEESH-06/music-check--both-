"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, Mail, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "admin@example.com",
    password: "password123",
    plan: "premium"
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("auth_token")) {
      router.replace("/");
    }
  }, [router]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let data;
      if (isRegister) {
        data = await registerUser({
          name: form.name,
          email: form.email,
          password: form.password,
          plan: form.plan
        });
      } else {
        data = await loginUser({
          email: form.email,
          password: form.password
        });
      }
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("echowave_user", JSON.stringify(data.user));
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-card" aria-labelledby="login-heading">
      <div className="card-header">
        <p className="eyebrow">{isRegister ? "Create Account" : "Account Access"}</p>
        <h2 id="login-heading">{isRegister ? "Sign Up" : "Login"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        {isRegister && (
          <label>
            <span>Full Name</span>
            <div className="input-wrap">
              <UserIcon size={18} aria-hidden="true" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="John Doe"
                required
              />
            </div>
          </label>
        )}

        <label>
          <span>Email address</span>
          <div className="input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
        </label>

        <label>
          <span>Password</span>
          <div className="input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
        </label>

        {isRegister && (
          <label>
            <span>Subscription Plan</span>
            <div className="input-wrap">
              <select
                name="plan"
                value={form.plan}
                onChange={updateField}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--text)",
                  width: "100%",
                  outline: "none"
                }}
              >
                <option value="premium" style={{ color: "#111827" }}>Premium Plan</option>
                <option value="free" style={{ color: "#111827" }}>Free Plan</option>
              </select>
            </div>
          </label>
        )}

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isRegister
              ? "Creating account..."
              : "Signing in..."
            : isRegister
            ? "Sign up"
            : "Sign in"}
        </button>

        <p style={{ textAlign: "center", marginTop: "10px", fontSize: "0.9rem" }}>
          {isRegister ? "Already have an account?" : "New to EchoWave?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--green)",
              cursor: "pointer",
              fontWeight: "bold",
              textDecoration: "underline",
              padding: 0
            }}
          >
            {isRegister ? "Sign In" : "Create one now"}
          </button>
        </p>
      </form>
    </section>
  );
}

