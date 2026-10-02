"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });
    const payload = await response.json();
    setPending(false);
    if (!payload.success) {
      setError(payload.error ?? "Request failed");
      return;
    }
    router.push("/console");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {mode === "register" ? (
        <input name="name" placeholder="Business name" required />
      ) : null}
      <input name="email" type="email" placeholder="Email" required className="w-full" />
      <input name="password" type="password" placeholder="Password" required minLength={8} className="w-full" />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {pending ? "Working..." : mode === "login" ? "Sign in" : "Create operator"}
      </button>
      <button
        className="w-full text-sm text-zinc-400"
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Need an operator account?" : "Already have an account?"}
      </button>
    </form>
  );
}
