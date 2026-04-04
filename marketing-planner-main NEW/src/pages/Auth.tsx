import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoSvg from '@/assets/logo.svg';
import { Loader2, User, Lock, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Look up email via server-side edge function (never exposes emails client-side)
      const lookupRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-lookup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ username: username.trim() }),
        }
      );
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.email) {
        throw new Error('Credenciais inválidas. Verifique seu nome e senha.');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password,
      });

      if (error) throw error;

      toast({ title: `Bem-vindo, ${username}! 🚀`, description: 'Login realizado com sucesso.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao entrar',
        description:
          err.message === 'Invalid login credentials'
            ? 'Credenciais inválidas. Verifique seu nome e senha.'
            : err.message ?? 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-card border-r border-border">
        <div className="flex items-center gap-3">
          <img src={logoSvg} alt="DQEF" className="h-10 w-10" />
          <div>
            <p className="text-gradient-orange text-base font-bold leading-tight">Deixa que eu faço</p>
            <p className="text-xs text-muted-foreground">Marketing Hub</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-foreground leading-tight">
              Sua operação<br />
              <span className="text-gradient-orange">de marketing</span><br />
              centralizada.
            </h1>
            <p className="text-muted-foreground text-lg">
              Kanban, calendário editorial, biblioteca de copies e analytics — tudo em um só lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Campanhas', value: 'Ativas' },
              { label: 'Copies prontas', value: 'Bibliotecadas' },
              { label: 'Calendário', value: 'Editorial' },
              { label: 'Analytics', value: 'Em tempo real' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 DQEF · Florianópolis · MVP v1.0</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <img src={logoSvg} alt="DQEF" className="h-10 w-10" />
            <p className="text-gradient-orange text-base font-bold">Deixa que eu faço</p>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">Entrar na plataforma</h2>
            <p className="text-muted-foreground text-sm">Acesse o hub de marketing da DQEF</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username">Seu nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Gustavo, Guilherme, Marcelo..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-orange text-primary-foreground font-semibold h-11"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
