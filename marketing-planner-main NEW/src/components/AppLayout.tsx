import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Bell, Search, LogOut, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral da operação de marketing' },
  '/kanban': { title: 'Kanban de Campanhas', subtitle: 'Gerencie o fluxo de campanhas' },
  '/calendario': { title: 'Calendário Editorial', subtitle: 'Planejamento de conteúdo' },
  '/biblioteca': { title: 'Biblioteca de Copies', subtitle: 'Estratégias e conteúdos prontos' },
  '/analytics': { title: 'Analytics', subtitle: 'Performance e métricas' },
  '/campanhas': { title: 'Gestão de Campanhas', subtitle: 'CRUD completo de campanhas' },
  '/criativo': { title: 'AI Criativo', subtitle: 'Gere roteiros de carrossel com IA' },
  '/ai-carrosseis': { title: 'AI Carrosséis', subtitle: 'Gere carrosséis com arte visual, copy e prompts por lâmina' },
  '/estrategia': { title: 'Playbook Estratégico', subtitle: 'Diretriz de marca que norteia todas as criações e comunicações' },
  '/video-ia': { title: 'Video IA — Higgsfield', subtitle: 'Workflow de diretor para vídeos com IA' },
  '/criativos-ativos': { title: 'Criativos Ativos', subtitle: 'Galeria de peças em produção com métricas de performance' },
  '/canais-organicos': { title: 'Canais Orgânicos', subtitle: 'Hub de inteligência por plataforma — Instagram, Facebook, TikTok, YouTube e LinkedIn' },
  '/brand-kit': { title: 'Brand Kit', subtitle: 'Central de identidade visual — logos, cores e tipografia' },
  '/relatorio': { title: 'Relatório da Plataforma', subtitle: 'Visão executiva para o conselho' },
};

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const page = Object.entries(pageTitles).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );
  const { title, subtitle } = page?.[1] ?? { title: 'DQEF Hub', subtitle: '' };

  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Auto-open on first visit
  useEffect(() => {
    const completed = localStorage.getItem('dqef_tutorial_completed');
    if (!completed) {
      setTutorialOpen(true);
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card/50 px-4 backdrop-blur">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex flex-1 items-center gap-3">
              <div>
                <h1 className="text-sm font-semibold leading-none text-foreground">{title}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTutorialOpen(true)}
                title="Tutorial de onboarding"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground animate-pulse-orange"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Search className="h-4 w-4" />
              </button>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
              <div
                title={user?.email ?? ''}
                className="flex h-8 w-8 items-center justify-center rounded-full gradient-orange text-xs font-bold text-white uppercase cursor-default"
              >
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  toast({ title: 'Até logo! 👋', description: 'Sessão encerrada.' });
                }}
                title="Sair"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto scrollbar-thin p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      <OnboardingTutorial open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </SidebarProvider>
  );
}
