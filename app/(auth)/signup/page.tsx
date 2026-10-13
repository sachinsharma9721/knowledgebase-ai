"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="glass-card animate-scale-in" style={{ padding: "var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>📬</div>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-sm)" }}>
          Check your email
        </h1>
        <p className="text-secondary" style={{ marginBottom: "var(--space-lg)" }}>
          We&apos;ve sent a confirmation link to <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link href="/login" className="btn btn-secondary">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card animate-scale-in" style={{ padding: "var(--space-xl)" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#lg2)" />
            <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="lg2" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: 700,
            background: "var(--color-accent-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            KnowledgeBase AI
          </span>
        </div>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-xs)" }}>
          Create your account
        </h1>
        <p className="text-secondary text-sm">Start building your knowledge bases</p>
      </div>

      {error && (
        <div
          className="animate-fade-in"
          style={{
            padding: "var(--space-sm) var(--space-md)",
            background: "var(--color-error-bg)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-error)",
            fontSize: "var(--font-size-sm)",
            marginBottom: "var(--space-md)",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="signup-email" className="label">Email</label>
          <input
            id="signup-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-password" className="label">Password</label>
          <input
            id="signup-password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password" className="label">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full"
          disabled={loading}
          style={{ marginTop: "var(--space-sm)" }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p
        style={{
          textAlign: "center",
          marginTop: "var(--space-lg)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--color-text-accent)", fontWeight: 500 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
