import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  workspaceId: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setWorkspaceId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    workspaceId: localStorage.getItem('dqef_workspace_id'),
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };

    // Auto-create workspace for new user
    if (data.user) {
      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({ name: name ? `${name}'s workspace` : 'Meu workspace', owner_id: data.user.id })
        .select('id')
        .single();

      if (!wsErr && ws) {
        await supabase.from('workspace_members').insert({
          workspace_id: ws.id,
          user_id: data.user.id,
          role: 'owner',
        });
        localStorage.setItem('dqef_workspace_id', ws.id);
        setState(prev => ({ ...prev, workspaceId: ws.id }));
      }
    }
    return { error: null };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('dqef_workspace_id');
    setState(prev => ({ ...prev, user: null, session: null, workspaceId: null }));
  };

  const setWorkspaceId = (id: string) => {
    localStorage.setItem('dqef_workspace_id', id);
    setState(prev => ({ ...prev, workspaceId: id }));
  };

  return (
    <AuthContext.Provider value={{ ...state, signInWithEmail, signUpWithEmail, signInWithMagicLink, signOut, setWorkspaceId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
