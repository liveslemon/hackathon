"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthState {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safeguard: Force loading to false after 10 seconds max if Supabase hangs
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            setUser(session.user);
            
            // Only fetch profile if user has changed or on refresh
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle(); // Better than .single() as it won't throw 406 on empty
            
            if (profileError) {
              console.error("Failed to fetch profile in auth change:", profileError);
            }
            setProfile(profileData);
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (err) {
          console.error("Auth context error handled silently:", err);
        } finally {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    );

    return () => {
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
