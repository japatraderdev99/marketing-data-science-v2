import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard, Target, MessageSquare, Megaphone, Kanban,
  CalendarDays, BookImage, BarChart3, Sparkles, Layers,
  Video, Ruler, ImagePlus, Globe, Palette,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
  dot?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, dot: true },
  { path: '/estrategia', label: 'Estratégia', icon: Target, highlight: true },
  { path: '/forum', label: 'Fórum', icon: MessageSquare, highlight: true },
  { path: '/campanhas', label: 'Campanhas', icon: Megaphone },
  { path: '/kanban', label: 'Kanban', icon: Kanban },
  { path: '/calendario', label: 'Calendário', icon: CalendarDays },
  { path: '/biblioteca', label: 'Biblioteca', icon: BookImage },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/criativo', label: 'AI Criativo', icon: Sparkles },
  { path: '/carrosseis', label: 'AI Carrosséis', icon: Layers },
  { path: '/video-ia', label: 'Video IA', icon: Video },
  { path: '/formatos', label: 'Formatos', icon: Ruler },
  { path: '/criativos-ativos', label: 'Criativos Ativos', icon: ImagePlus },
  { path: '/canais-organicos', label: 'Canais Orgânicos', icon: Globe },
  { path: '/brand-kit', label: 'Brand Kit', icon: Palette },
];

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleNavClick = () => {
    // Close mobile drawer on navigation
    setMobileOpen(false);
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-all duration-300',
      /* Desktop: always visible, collapsible */
      collapsed ? 'lg:w-16' : 'lg:w-60',
      /* Mobile: full-width drawer, slides in/out */
      'w-64',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    )}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xs">X</span>
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="flex flex-col leading-tight">
            <span className="font-heading font-black text-sm text-brand tracking-wider">
              Deixa que eu faço
            </span>
            <span className="text-[10px] text-text-muted">Marketing Hub</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const showLabel = !collapsed || mobileOpen;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group',
                active
                  ? 'bg-brand/15 text-brand'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
              )}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', active && 'text-brand')} />
              {showLabel && <span>{item.label}</span>}
              {showLabel && item.highlight && (
                <div className={cn(
                  'ml-auto w-2 h-2 rounded-full',
                  active ? 'bg-brand' : 'bg-brand/50',
                )} />
              )}
              {showLabel && item.dot && !item.highlight && !active && (
                <div className="ml-auto w-2 h-2 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        'px-3 py-3 border-t border-sidebar-border shrink-0',
        collapsed && !mobileOpen && 'px-2',
      )}>
        {(!collapsed || mobileOpen) && user && (
          <div className="mb-2 px-2 py-2 rounded-lg bg-surface-hover flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-brand">{(user.email?.[0] || 'U').toUpperCase()}</span>
            </div>
            <span className="text-[10px] text-text-muted truncate flex-1">{user.email}</span>
            <button onClick={signOut} className="text-text-muted hover:text-red-400 transition-colors shrink-0" title="Sair">
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
        {(!collapsed || mobileOpen) && !user && (
          <div className="mb-2 px-2 py-2 rounded-lg bg-brand/10">
            <p className="text-[10px] font-bold text-brand uppercase tracking-wider">MVP v1.0</p>
            <p className="text-[10px] text-text-muted">Florianópolis · Q1 2026</p>
          </div>
        )}
        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          onClick={toggle}
          className="hidden lg:flex w-full h-8 items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
