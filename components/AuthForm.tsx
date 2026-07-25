"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create account");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong — try again");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[360px] rounded-[10px] border border-border bg-card p-6">
      <div className="mb-5 flex rounded-[6px] border border-border p-1">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`flex-1 rounded-[4px] py-1.5 text-[12px] font-medium transition-colors ${
            mode === "signin"
              ? "bg-accent-tint text-accent"
              : "text-text-secondary"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex-1 rounded-[4px] py-1.5 text-[12px] font-medium transition-colors ${
            mode === "signup"
              ? "bg-accent-tint text-accent"
              : "text-text-secondary"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-[12px] font-medium text-text-primary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-[6px] border border-border px-3 py-1.5 text-[14px] text-text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-[12px] font-medium text-text-primary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-[6px] border border-border px-3 py-1.5 text-[14px] text-text-primary outline-none focus:border-accent"
          />
        </div>

        {error && (
          <p className="rounded-[6px] bg-danger-tint px-3 py-2 text-[12px] text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex h-8 items-center justify-center rounded-[6px] bg-accent text-[12px] font-medium text-white disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
