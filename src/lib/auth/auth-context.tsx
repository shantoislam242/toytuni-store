"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth/admin";

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Supabase client is stable for the component's lifetime — created once.
  const [supabase] = useState(() => createBrowserSupabase());

  useEffect(() => {
    let active = true;

    // Initial check: validates the token against Supabase (not just reading
    // the local cookie), matching the server's `getUser()`-based check.
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: isAdmin(user?.email),
      loading,
      signOut,
    }),
    [user, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
