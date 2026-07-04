"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type AuthActionResult = {
  error?: string;
  notice?: string;
};

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  supabase: SupabaseClient<Database> | null;
  user: User | null;
  /** Unique handle from the profiles table (null until loaded / for guests). */
  username: string | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  /** True when the username is free (or unchanged for the current user). */
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  updateUsername: (username: string) => Promise<AuthActionResult>;
  updateEmail: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
}

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [username, setUsername] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        // getSession() returns the session from local storage without contacting
        // the server, so it can be stale — e.g. the refresh token was revoked or
        // the Supabase project was reset. Verify it resolves to a real user; if
        // not, clear it so the UI never claims we're logged in while the server
        // treats every request as an anonymous guest.
        if (data.session) {
          const { error } = await supabase.auth.getUser();
          // Only clear on a genuine auth rejection (revoked/invalid token), not
          // a transient network error — otherwise an offline user gets logged
          // out for no reason. The server re-validates on the next real request.
          if (error && (error.status === 401 || error.status === 403)) {
            await supabase.auth.signOut();
            if (active) setSession(null);
            return;
          }
        }
        if (active) setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load the profile handle whenever the signed-in user changes.
  useEffect(() => {
    if (!supabase || !userId) {
      setUsername(null);
      return;
    }

    let active = true;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setUsername(data?.username ?? null);
      });

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!supabase) return { error: "Supabase is not configured yet." };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { notice: "Signed in." };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      handle: string,
    ): Promise<AuthActionResult> => {
      if (!supabase) return { error: "Supabase is not configured yet." };
      const redirectTo =
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: handle },
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        },
      });

      if (error) return { error: error.message };
      return {
        notice: data.session
          ? "Account created and signed in."
          : "Account created. Check your email to confirm it.",
      };
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) return { error: "Supabase is not configured yet." };
    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });
    // On success the browser is redirected to Google, so there's nothing to show.
    if (error) return { error: error.message };
    return {};
  }, [supabase]);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) return { error: "Supabase is not configured yet." };
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    setSession(null);
    setUsername(null);
    return { notice: "Signed out." };
  }, [supabase]);

  const checkUsernameAvailable = useCallback(
    async (candidate: string): Promise<boolean> => {
      if (!supabase) return true;
      const { data, error } = await supabase.rpc("username_available", {
        candidate,
      });
      // Fail open: if the RPC is missing (migration not applied) or errors, don't
      // block sign-up — the unique index + trigger are the real guard.
      if (error) {
        console.warn("username_available check failed; allowing sign-up.", error);
        return true;
      }
      return Boolean(data);
    },
    [supabase],
  );

  const updateUsername = useCallback(
    async (nextUsername: string): Promise<AuthActionResult> => {
      if (!supabase || !userId) return { error: "You need to be signed in." };
      const trimmed = nextUsername.trim();
      if (!USERNAME_PATTERN.test(trimmed)) {
        return { error: "Usernames are 3–30 letters, numbers, or underscores." };
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("id", userId);

      if (error) {
        if (error.code === "23505") return { error: "That username is already taken." };
        return { error: error.message };
      }

      // Keep auth metadata in step with the profiles table.
      await supabase.auth.updateUser({ data: { username: trimmed } });
      setUsername(trimmed);
      return { notice: "Username updated." };
    },
    [supabase, userId],
  );

  const updateEmail = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      if (!supabase) return { error: "Supabase is not configured yet." };
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) return { error: error.message };
      return { notice: "Check your inbox to confirm the new email." };
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthActionResult> => {
      if (!supabase) return { error: "Supabase is not configured yet." };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: error.message };
      return { notice: "Password updated." };
    },
    [supabase],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      supabase,
      user: session?.user ?? null,
      username,
      checkUsernameAvailable,
      updateUsername,
      updateEmail,
      updatePassword,
    }),
    [
      configured,
      loading,
      session,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      supabase,
      username,
      checkUsernameAvailable,
      updateUsername,
      updateEmail,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
