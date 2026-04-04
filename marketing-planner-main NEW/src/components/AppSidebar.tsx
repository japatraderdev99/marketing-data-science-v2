import { useLocation, Link } from 'react-router-dom';
import logoSvg from '@/assets/logo.svg';
import {
  LayoutDashboard,
  Trello,
  CalendarDays,
  BookOpen,
  BarChart3,
  Megaphone,
  Sparkles,
  Clapperboard,
  Layers,
  ChevronLeft,
  ChevronRight,
  Target,
  MessageSquareText,
  Ruler,
  Image,
  Globe,
  Palette,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Estratégia', url: '/estrategia', icon: Target, highlight: true },
  { title: 'Fórum', url: '/forum', icon: MessageSquareText, highlight: true },
  { title: 'Campanhas', url: '/campanhas', icon: Megaphone },
  { title: 'Kanban', url: '/kanban', icon: Trello },
  { title: 'Calendário', url: '/calendario', icon: CalendarDays },
  { title: 'Biblioteca', url: '/biblioteca', icon: BookOpen },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'AI Criativo', url: '/criativo', icon: Sparkles },
  { title: 'AI Carrosséis', url: '/ai-carrosseis', icon: Layers },
  { title: 'Video IA', url: '/video-ia', icon: Clapperboard },
  { title: 'Formatos', url: '/formatos', icon: Ruler },
  { title: 'Criativos Ativos', url: '/criativos-ativos', icon: Image },
  { title: 'Canais Orgânicos', url: '/canais-organicos', icon: Globe },
  { title: 'Brand Kit', url: '/brand-kit', icon: Palette },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-border transition-all duration-300',
        collapsed ? 'h-16 justify-center px-2' : 'h-16 px-4 gap-3'
      )}>
        <div className={cn('flex shrink-0 items-center justify-center rounded-lg', collapsed ? 'h-9 w-9' : 'h-9 w-9')}>
          <img src={logoSvg} alt="DQEF Logo" className="h-9 w-9 object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 animate-fade-in">
            <p className="text-gradient-orange truncate text-sm font-bold leading-tight">Deixa que eu faço</p>
            <p className="truncate text-xs text-muted-foreground">Marketing Hub</p>
          </div>
        )}
      </div>

      <SidebarContent className="px-2 py-3">
        {/* Strategy item — pinned at top, always highlighted */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url ||
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                const isHighlight = item.highlight;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link
                        to={item.url}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                          isHighlight
                            ? isActive
                              ? 'font-bold bg-primary/20 text-primary shadow-sm border border-primary/30'
                              : 'font-bold border border-primary/25 bg-primary/8 text-primary/85 hover:bg-primary/15 hover:text-primary'
                            : isActive
                              ? 'font-medium bg-primary/15 text-primary shadow-sm'
                              : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 shrink-0', (isActive || isHighlight) && 'text-primary')} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                        {isHighlight && !collapsed && !isActive && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse" />
                        )}
                        {isActive && !collapsed && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <div className="border-t border-border p-2">
        {!collapsed && (
          <div className="mb-2 rounded-lg bg-primary/10 px-3 py-2 animate-fade-in">
            <p className="text-xs font-semibold text-primary">MVP v1.0</p>
            <p className="text-xs text-muted-foreground">Florianópolis · Q1 2026</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </Sidebar>
  );
}
