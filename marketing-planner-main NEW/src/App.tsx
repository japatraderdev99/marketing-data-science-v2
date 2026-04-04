import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Kanban from "./pages/Kanban";
import Calendario from "./pages/Calendario";
import Biblioteca from "./pages/Biblioteca";
import Analytics from "./pages/Analytics";
import Campanhas from "./pages/Campanhas";
import Auth from "./pages/Auth";
import Criativo from "./pages/Criativo";
import VideoIA from "./pages/VideoIA";
import AiCarrosseis from "./pages/AiCarrosseis";
import Estrategia from "./pages/Estrategia";
import Forum from "./pages/Forum";
import Formatos from "./pages/Formatos";
import CriativosAtivos from "./pages/CriativosAtivos";
import CanaisOrganicos from "./pages/CanaisOrganicos";
import BrandKit from "./pages/BrandKit";
import RelatorioPlataforma from "./pages/RelatorioPlataforma";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/kanban" element={<Kanban />} />
                      <Route path="/calendario" element={<Calendario />} />
                      <Route path="/biblioteca" element={<Biblioteca />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/campanhas" element={<Campanhas />} />
                      <Route path="/criativo" element={<Criativo />} />
                      <Route path="/ai-carrosseis" element={<AiCarrosseis />} />
                      <Route path="/video-ia" element={<VideoIA />} />
                      <Route path="/estrategia" element={<Estrategia />} />
                      <Route path="/forum" element={<Forum />} />
                      <Route path="/formatos" element={<Formatos />} />
                      <Route path="/criativos-ativos" element={<CriativosAtivos />} />
                      <Route path="/canais-organicos" element={<CanaisOrganicos />} />
                      <Route path="/brand-kit" element={<BrandKit />} />
                      <Route path="/relatorio" element={<RelatorioPlataforma />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

