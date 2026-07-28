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

    // Use getSession (no lock contention) for initial check;
    // onAuthStateChange will handle token refresh events.
    const checkInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted && !session?.user) {
        setLoading(false);
      }
    };
    checkInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user ?? null;

        if (currentUser) {
          setUser((prev) => (prev?.id === currentUser.id ? prev : currentUser));

          // Simple retry logic for transient network/socket errors
          let attempts = 0;
          let profileData: AuthProfile = null;
          let profileError: { message?: string } | null = null;

          while (attempts < 2) {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .maybeSingle();

            if (!error) {
              profileData = (data as AuthProfile) ?? null;
              break;
            }

            profileError = error as { message?: string };
            attempts++;
            if (attempts < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          if (profileError) {
            console.warn(
              "Profile fetch issue (likely transient):",
              profileError.message || "Unknown profile fetch error",
            );
          }

          if (isMounted) {
            setProfile(profileData);
          }
        } else {
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch {
        // Swallow common refresh errors
      } finally {
        clearTimeout(safetyTimeout);
        if (isMounted) setLoading(false);
      }
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
