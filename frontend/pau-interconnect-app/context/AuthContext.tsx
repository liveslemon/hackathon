"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/domain";

type AuthProfile = (Partial<Profile> & Record<string, unknown>) | null;

interface AuthState {
  user: User | null;
  profile: AuthProfile;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safeguard: Force loading to false after 10 seconds max if Supabase hangs
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    let isMounted = true;

    const loadProfile = async (userId: string) => {
      try {
        // Simple retry logic for transient network/socket errors
        let profileData: AuthProfile = null;
        let profileError: { message?: string } | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          if (!error) {
            profileData = (data as AuthProfile) ?? null;
            profileError = null;
            break;
          }
          profileError = error as { message?: string };
          if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (profileError) {
          console.warn(
            "Profile fetch issue (likely transient):",
            profileError.message || "Unknown profile fetch error",
          );
        }
        if (isMounted) setProfile(profileData);
      } catch {
        // Swallow common refresh errors
      } finally {
        clearTimeout(safetyTimeout);
        if (isMounted) setLoading(false);
      }
    };

    // The callback runs while supabase-js holds its auth lock. Awaiting any
    // Supabase call in here waits on that same lock until it is forcibly
    // stolen ("AbortError: Lock was stolen by another request"), failing
    // every request queued behind it. So: update state synchronously and run
    // the profile query after the callback returns, as Supabase recommends.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        clearTimeout(safetyTimeout);
        return;
      }
      setUser((prev) => (prev?.id === currentUser.id ? prev : currentUser));
      setTimeout(() => {
        void loadProfile(currentUser.id);
      }, 0);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
