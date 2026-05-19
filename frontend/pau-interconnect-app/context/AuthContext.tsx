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

    let isMounted = true;

    // Trigger initial session check immediately in case onAuthStateChange is delayed
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted && session?.user) {
        // This will trigger the logic to fetch profile and set user
        // We actually just need to wait for onAuthStateChange usually, 
        // but if it's already stale, we force it.
      } else if (isMounted && !session) {
        setLoading(false); // No session, stop loading
      }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            if (user?.id !== session.user.id) {
              setUser(session.user);
              
              // Simple retry logic for transient network/socket errors
              let attempts = 0;
              let profileData = null;
              let profileError = null;

              while (attempts < 2) {
                const { data, error } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", session.user.id)
                  .maybeSingle();
                
                if (!error) {
                  profileData = data;
                  break;
                }
                
                profileError = error;
                attempts++;
                if (attempts < 2) await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
              }
              
              if (profileError && Object.keys(profileError).length > 0) {
                console.warn("Profile fetch issue (likely transient):", profileError.message || JSON.stringify(profileError));
              }
              
              if (isMounted) setProfile(profileData);
            }
          } else {
            if (isMounted) {
              setUser(null);
              setProfile(null);
            }
          }
        } catch (err) {
          // Swallow common refresh errors
        } finally {
          clearTimeout(safetyTimeout);
          if (isMounted) setLoading(false);
        }
      }
    );

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
