import { lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Estrategia = lazy(() => import('@/pages/Estrategia'));
const Forum = lazy(() => import('@/pages/Forum'));
const Campanhas = lazy(() => import('@/pages/Campanhas'));
const KanbanPage = lazy(() => import('@/pages/KanbanPage'));
const Calendario = lazy(() => import('@/pages/Calendario'));
const Biblioteca = lazy(() => import('@/pages/Biblioteca'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Criativo = lazy(() => import('@/pages/Criativo'));
const AiCarrosseis = lazy(() => import('@/pages/AiCarrosseis'));
const VideoIA = lazy(() => import('@/pages/VideoIA'));
const Formatos = lazy(() => import('@/pages/Formatos'));
const CriativosAtivos = lazy(() => import('@/pages/CriativosAtivos'));
const CanaisOrganicos = lazy(() => import('@/pages/CanaisOrganicos'));
const BrandKit = lazy(() => import('@/pages/BrandKit'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 max-w-lg">
            <p className="text-danger text-sm font-mono mb-2">Erro:</p>
            <p className="text-text-primary text-sm">{this.state.error.message}</p>
            <pre className="text-[10px] text-text-muted mt-2 text-left overflow-auto max-h-40">{this.state.error.stack}</pre>
            <button onClick={() => { this.setState({ error: null }); window.location.href = '/'; }} className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm">Voltar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/estrategia" element={<Estrategia />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/campanhas" element={<Campanhas />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/biblioteca" element={<Biblioteca />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/criativo" element={<Criativo />} />
                <Route path="/carrosseis" element={<AiCarrosseis />} />
                <Route path="/video-ia" element={<VideoIA />} />
                <Route path="/formatos" element={<Formatos />} />
                <Route path="/criativos-ativos" element={<CriativosAtivos />} />
                <Route path="/canais-organicos" element={<CanaisOrganicos />} />
                <Route path="/brand-kit" element={<BrandKit />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppLayout>
        <Toaster position="bottom-right" theme="dark" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
