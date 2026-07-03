"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/useAuth";

type Feedback = { error?: string; notice?: string } | null;

export default function ProfilePage() {
  const {
    loading,
    user,
    username,
    signOut,
    updateUsername,
    updateEmail,
    updatePassword,
  } = useAuth();

  return (
    <PageShell>
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow justify-center">Account</p>
        <h1 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
          Your <span className="neon-text">profile</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-white/55">
          Update your username, email, and password.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-2xl space-y-6">
        {loading ? (
          <p className="text-center text-sm text-white/40">Checking session…</p>
        ) : !user ? (
          <section className="glass led-ring p-6 text-center">
            <p className="text-sm text-white/60">You&apos;re not signed in.</p>
            <Link href="/?panel=account" className="btn-primary mt-5 text-sm">
              Log in
            </Link>
          </section>
        ) : (
          <>
            <UsernameForm
              current={username}
              onSave={(value) => updateUsername(value)}
            />
            <EmailForm current={user.email ?? ""} onSave={(value) => updateEmail(value)} />
            <PasswordForm onSave={(value) => updatePassword(value)} />

            <section className="glass led-ring flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-semibold text-white">Sign out</p>
                <p className="text-xs text-white/45">End your session on this device.</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:border-red-400/40 hover:text-red-200"
              >
                Sign out
              </button>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}

function UsernameForm({
  current,
  onSave,
}: {
  current: string | null;
  onSave: (value: string) => Promise<{ error?: string; notice?: string }>;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setValue(current ?? "");
  }, [current]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setPending(true);
    setFeedback(await onSave(value.trim()));
    setPending(false);
  };

  const unchanged = value.trim() === (current ?? "");

  return (
    <FormSection
      title="Username"
      hint="3–30 letters, numbers, or underscores. Must be unique."
      onSubmit={submit}
      pending={pending}
      disabled={unchanged || !value.trim()}
      feedback={feedback}
    >
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="username"
        placeholder="your_handle"
        className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
      />
    </FormSection>
  );
}

function EmailForm({
  current,
  onSave,
}: {
  current: string;
  onSave: (value: string) => Promise<{ error?: string; notice?: string }>;
}) {
  const [value, setValue] = useState(current);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setValue(current);
  }, [current]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setPending(true);
    setFeedback(await onSave(value.trim()));
    setPending(false);
  };

  const unchanged = value.trim() === current;

  return (
    <FormSection
      title="Email"
      hint="Changing your email needs confirmation from a link we send you."
      onSubmit={submit}
      pending={pending}
      disabled={unchanged || !value.trim()}
      feedback={feedback}
    >
      <input
        type="email"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
      />
    </FormSection>
  );
}

function PasswordForm({
  onSave,
}: {
  onSave: (value: string) => Promise<{ error?: string; notice?: string }>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (password.length < 6) {
      setFeedback({ error: "Passwords must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setFeedback({ error: "Passwords do not match." });
      return;
    }

    setPending(true);
    const result = await onSave(password);
    setPending(false);
    setFeedback(result);
    if (!result.error) {
      setPassword("");
      setConfirm("");
    }
  };

  return (
    <FormSection
      title="Password"
      hint="Use at least 6 characters."
      onSubmit={submit}
      pending={pending}
      disabled={!password || !confirm}
      feedback={feedback}
    >
      <div className="space-y-2">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="New password"
          className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
        />
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          placeholder="Confirm new password"
          className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-neon-cyan/50"
        />
      </div>
    </FormSection>
  );
}

function FormSection({
  title,
  hint,
  onSubmit,
  pending,
  disabled,
  feedback,
  children,
}: {
  title: string;
  hint: string;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  disabled: boolean;
  feedback: Feedback;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="glass led-ring space-y-3 p-5">
      <div>
        <h2 className="text-sm font-semibold text-white/85">{title}</h2>
        <p className="mt-0.5 text-xs text-white/45">{hint}</p>
      </div>

      {children}

      {feedback?.error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-200">
          {feedback.error}
        </p>
      )}
      {feedback?.notice && (
        <p className="rounded-lg border border-neon-lime/25 bg-neon-lime/10 px-3 py-2 text-sm text-neon-lime">
          {feedback.notice}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending || disabled} className="btn-primary text-sm">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
