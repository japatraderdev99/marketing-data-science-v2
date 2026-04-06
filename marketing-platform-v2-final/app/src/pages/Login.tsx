import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Tab = 'login' | 'signup' | 'magic';

export default function Login() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithMagicLink } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="max-w-md text-center p-8">
          <h1 className="font-heading font-black text-2xl text-text-primary mb-2">DQEF STUDIO</h1>
          <p className="text-sm text-text-muted mb-4">Supabase não configurado. Configure as variáveis de ambiente para habilitar autenticação.</p>
          <a href="/" className="text-brand text-sm hover:underline">Entrar sem autenticação</a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (tab === 'magic') {
        const { error: err } = await signInWithMagicLink(email);
        if (err) setError(err);
        else setMagicSent(true);
      } else if (tab === 'signup') {
        const { error: err } = await signUpWithEmail(email, password, name);
        if (err) setError(err);
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) setError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-3">
            <span className="font-heading font-black text-white text-lg">X</span>
          </div>
          <h1 className="font-heading font-black text-xl text-text-primary">DQEF STUDIO</h1>
          <p className="text-xs text-text-muted mt-1">Marketing Hub para prestadores de serviço</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-hover rounded-lg p-0.5">
          {([
            { id: 'login' as Tab, label: 'Entrar' },
            { id: 'signup' as Tab, label: 'Criar Conta' },
            { id: 'magic' as Tab, label: 'Magic Link' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(null); setMagicSent(false); }}
              className={cn(
                'flex-1 py-2 rounded-md text-xs font-semibold transition-all',
                tab === t.id ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Magic link sent */}
        {magicSent ? (
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-6 text-center">
            <Mail className="w-8 h-8 text-brand mx-auto mb-3" />
            <p className="text-sm text-text-primary font-medium">Link enviado!</p>
            <p className="text-xs text-text-muted mt-1">Verifique sua caixa de entrada em <span className="text-brand">{email}</span></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-surface-hover border border-border rounded-lg pl-10 pr-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-surface-hover border border-border rounded-lg pl-10 pr-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
              />
            </div>

            {tab !== 'magic' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Senha"
                  minLength={6}
                  className="w-full bg-surface-hover border border-border rounded-lg pl-10 pr-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {tab === 'login' ? 'Entrar' : tab === 'signup' ? 'Criar Conta' : 'Enviar Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-[10px] text-text-muted text-center">
          Ao continuar, você concorda com os termos de uso do DQEF Studio.
        </p>
      </div>
    </div>
  );
}
