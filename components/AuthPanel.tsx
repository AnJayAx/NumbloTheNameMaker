"use client";

import { FormEvent, useState } from "react";
import Modal from "@/components/Modal";
import { USERNAME_PATTERN, useAuth } from "@/lib/useAuth";

type AuthMode = "sign-in" | "sign-up";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthPanel({ open, onOpenChange }: Props) {
  const {
    configured,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
    user,
    checkUsernameAvailable,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !password) {
      setError("Enter an email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Passwords must be at least 6 characters.");
      return;
    }

    if (mode === "sign-up") {
      const handle = username.trim();
      if (!USERNAME_PATTERN.test(handle)) {
        setError("Pick a username: 3–30 letters, numbers, or underscores.");
        return;
      }

      setPending(true);
      const available = await checkUsernameAvailable(handle);
      if (!available) {
        setPending(false);
        setError("That username is already taken. Try another.");
        return;
      }

      const result = await signUp(email.trim(), password, handle);
      setPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.notice ?? "Done.");
      return;
    }

    setPending(true);
    const result = await signIn(email.trim(), password);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage(result.notice ?? "Done.");
    setPassword("");
  };

  const handleGoogle = async () => {
    setError(null);
    setMessage(null);
    setPending(true);
    const result = await signInWithGoogle();
    // On success the page redirects to Google; only reached here on error.
    setPending(false);
    if (result.error) setError(result.error);
  };

  const handleSignOut = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await signOut();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(result.notice ?? "Signed out.");
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Account" ariaLabel="Account">
      <div className="space-y-5">
        {!configured ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">
            <p className="font-semibold text-amber-100">Supabase is not configured.</p>
            <p className="mt-2 leading-snug text-amber-100/65">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
              in `.env.local` and Vercel. Guest history and saved names still use this
              browser.
            </p>
          </div>
        ) : loading ? (
          <p className="mt-6 text-center text-sm text-white/40">Checking session...</p>
        ) : user ? (
          <div className="space-y-5">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="mb-2 inline-flex rounded-full border border-neon-lime/30 bg-neon-lime/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neon-lime">
                Signed in
              </span>
              <p className="break-all text-sm font-semibold text-white/85">{user.email}</p>
              <p className="mt-2 text-xs leading-snug text-white/40">
                History and saved names sync to your Supabase account.
              </p>
            </section>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={pending}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:border-red-400/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pending ? "Signing out..." : "Sign out"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={pending}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-wide text-white/35">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  mode === "sign-in"
                    ? "border-neon-cyan/50 bg-neon-cyan/10 text-white shadow-led-cyan"
                    : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25",
                ].join(" ")}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  mode === "sign-up"
                    ? "border-neon-lime/50 bg-neon-lime/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25",
                ].join(" ")}
              >
                Create account
              </button>
            </div>

            {mode === "sign-up" && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-white/80">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
                  placeholder="your_handle"
                />
                <span className="mt-1 block text-[11px] text-white/35">
                  3–30 letters, numbers, or underscores. Must be unique.
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white/80">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white/80">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
                placeholder="At least 6 characters"
              />
            </label>

            <button type="submit" disabled={pending} className="btn-primary w-full text-sm">
              {pending
                ? "Working..."
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </button>
            </form>
          </div>
        )}

        {message && (
          <p className="rounded-xl border border-neon-lime/25 bg-neon-lime/10 px-3 py-2 text-sm text-neon-lime">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
