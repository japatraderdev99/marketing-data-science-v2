import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

function Layout({ children }: { children: ReactNode }) {
  const { collapsed, mobileOpen, toggleMobile, setMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar />

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border z-20 flex items-center px-4 gap-3">
        <button
          onClick={toggleMobile}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col leading-tight">
          <span className="font-heading font-black text-sm text-brand tracking-wider">Deixa que eu faço</span>
          <span className="text-[10px] text-text-muted">Marketing Hub</span>
        </div>
      </div>

      <main className={cn(
        'min-h-screen transition-all duration-300',
        /* mobile: padding-top for the fixed top bar */
        'pt-14 lg:pt-0',
        /* desktop: offset by sidebar width */
        collapsed ? 'lg:ml-16' : 'lg:ml-60',
      )}>
        {children}
      </main>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Layout>{children}</Layout>
    </SidebarProvider>
  );
}
