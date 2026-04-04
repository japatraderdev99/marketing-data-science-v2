# DQEF Marketing Hub — Relatório Técnico Frontend Completo

**Documento de Replicação Visual e Arquitetural**
**Data:** 2026-04-04 | **Versão:** 1.0

---

## 1. STACK FRONTEND

| Tecnologia | Versão | Função |
|---|---|---|
| React | 18.3.1 | UI framework (SPA) |
| Vite | 5.4.19 | Bundler + dev server |
| TypeScript | 5.8.3 | Type safety |
| Tailwind CSS | 3.4.17 | Utility-first CSS |
| tailwindcss-animate | 1.0.7 | Animações declarativas |
| shadcn/ui | (Radix-based) | Componentes base |
| Recharts | 2.15.4 | Charts (AreaChart, PieChart, BarChart, RadialBar, LineChart) |
| @dnd-kit | core 6.3 + sortable 10.0 | Drag-and-drop (Kanban) |
| html-to-image | 1.11.13 | Export PNG 3x (criativos) |
| html2pdf.js | 0.10.2 | Export PDF (relatórios) |
| JSZip | 3.10.1 | Download ZIP em lote |
| Lucide React | 0.462.0 | Ícones |
| date-fns | 3.6.0 | Manipulação de datas |
| react-router-dom | 6.30.1 | Roteamento SPA |
| @tanstack/react-query | 5.83.0 | Data fetching + cache |
| @supabase/supabase-js | 2.97.0 | Client SDK Supabase |
| react-hook-form + zod | 7.61.1 + 3.25.76 | Formulários + validação |
| embla-carousel-react | 8.6.0 | Carousel component |
| react-resizable-panels | 2.1.9 | Painéis redimensionáveis |
| sonner | 1.7.4 | Toasts modernos |
| vaul | 0.9.9 | Drawer component |
| cmdk | 1.1.1 | Command palette |
| class-variance-authority | 0.7.1 | Variant styles |
| clsx + tailwind-merge | 2.1.1 + 2.6.0 | Class merging |

### 1.1 Configuração Vite

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080, hmr: { overlay: false } },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
```

**Path alias:** `@` → `./src` (usado em todos os imports)

### 1.2 TypeScript Config

- `tsconfig.app.json` — target: ES2020, module: ESNext, JSX: react-jsx
- Strict mode ativado
- Paths: `@/*` → `src/*`

---

## 2. SISTEMA DE DESIGN — IDENTIDADE VISUAL DQEF

### 2.1 Paleta de Cores (CSS Custom Properties)

**CRÍTICO**: Todo o design é **Dark Mode Only**. Não existe light mode.

```css
/* src/index.css — :root */

/* Backgrounds */
--background: 0 0% 5%;        /* #0D0D0D — fundo principal */
--card: 0 0% 9%;               /* #171717 — cards */
--popover: 0 0% 9%;            /* #171717 — popovers */

/* Texto */
--foreground: 0 0% 95%;        /* #F2F2F2 — texto principal */
--muted-foreground: 0 0% 50%;  /* #808080 — texto secundário */
--secondary-foreground: 0 0% 85%; /* #D9D9D9 */

/* Cores da Marca */
--primary: 33 100% 50%;        /* #FF8A00 — Laranja DQEF (COR PRINCIPAL) */
--primary-foreground: 0 0% 5%; /* #0D0D0D — texto sobre laranja */
--teal: 185 100% 36%;          /* #00A7B5 — Teal DQEF (COR SECUNDÁRIA) */
--teal-foreground: 0 0% 100%;  /* #FFFFFF */

/* Superfícies */
--secondary: 0 0% 12%;         /* #1F1F1F */
--muted: 0 0% 12%;             /* #1F1F1F */
--accent: 0 0% 14%;            /* #242424 */
--border: 0 0% 15%;            /* #262626 */
--input: 0 0% 12%;             /* #1F1F1F */
--ring: 33 100% 50%;           /* #FF8A00 */

/* Destrutivo */
--destructive: 0 72% 51%;      /* #DC2626 */

/* Raio de borda global */
--radius: 0.75rem;             /* 12px */

/* Status (Kanban/Campanhas) */
--status-draft: 220 14% 40%;      /* Cinza-azulado */
--status-review: 45 93% 47%;      /* Amarelo */
--status-approved: 142 71% 45%;   /* Verde */
--status-active: 185 100% 36%;    /* Teal */
--status-paused: 25 95% 53%;      /* Laranja escuro */
--status-published: 262 83% 58%;  /* Roxo */

/* Prioridades */
--priority-high: 0 72% 51%;       /* Vermelho */
--priority-medium: 33 100% 50%;   /* Laranja */
--priority-low: 142 71% 45%;      /* Verde */

/* Sidebar */
--sidebar-background: 0 0% 7%;    /* #121212 */
--sidebar-foreground: 0 0% 85%;   /* #D9D9D9 */
--sidebar-primary: 33 100% 50%;   /* #FF8A00 */
--sidebar-accent: 0 0% 12%;       /* #1F1F1F */
--sidebar-border: 0 0% 12%;       /* #1F1F1F */
```

### 2.2 Cores Diretas (Tailwind Config)

```typescript
// tailwind.config.ts → theme.extend.colors
dqef: {
  orange: "hsl(33 100% 50%)",    // #FF8A00
  teal: "hsl(185 100% 36%)",     // #00A7B5
  dark: "hsl(0 0% 5%)",          // #0D0D0D
  card: "hsl(0 0% 9%)",          // #171717
}
```

### 2.3 Design Tokens em JS (Dashboard)

```typescript
// src/pages/Index.tsx
const C = {
  orange: 'hsl(33, 100%, 50%)',   // Charts, KPIs
  teal: 'hsl(185, 100%, 36%)',    // Charts, badges
  purple: 'hsl(262, 83%, 58%)',   // Canais, impressões
  blue: 'hsl(217, 91%, 60%)',     // Links, team
  green: 'hsl(142, 71%, 45%)',    // Sucesso, metas
  red: 'hsl(0, 72%, 51%)',        // Alertas, erros
  amber: 'hsl(45, 93%, 47%)',     // Warnings
};
```

### 2.4 Tipografia

```css
/* Fonte principal */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Headings */
h1, h2, h3 { font-weight: 700; letter-spacing: -0.02em; }
```

**A fonte Inter NÃO é importada via Google Fonts** — depende do sistema operacional. Para replicação perfeita, adicionar:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
```

### 2.5 Classes Utilitárias Custom

```css
/* Gradientes */
.gradient-orange { background: linear-gradient(135deg, hsl(33 100% 50%), hsl(25 100% 45%)); }
.gradient-teal   { background: linear-gradient(135deg, hsl(185 100% 36%), hsl(195 100% 30%)); }

/* Texto gradiente */
.text-gradient-orange {
  background: linear-gradient(135deg, hsl(33 100% 55%), hsl(25 100% 50%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Glow effects (cards de destaque) */
.card-glow-orange { box-shadow: 0 0 20px hsl(33 100% 50% / 0.15); }
.card-glow-teal   { box-shadow: 0 0 20px hsl(185 100% 36% / 0.15); }

/* Scrollbar fina */
.scrollbar-thin { scrollbar-width: thin; scrollbar-color: hsl(var(--border)) transparent; }
```

### 2.6 Animações

```typescript
// tailwind.config.ts → keyframes + animation
"slide-in":     "translateX(-10px) → translateX(0), opacity 0→1" (0.3s ease-out)
"fade-in":      "translateY(4px) → translateY(0), opacity 0→1"  (0.25s ease-out)
"pulse-orange":  "boxShadow pulse #FF8A00" (2s infinite)
"accordion-down/up": Radix accordion height animation (0.2s ease-out)
```

---

## 3. ARQUITETURA DE COMPONENTES

### 3.1 Árvore de Renderização Principal

```text
<App>
  <QueryClientProvider>
    <TooltipProvider>
      <Toaster /> <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            /auth → <Auth />
            /* → <ProtectedRoute>
                    <AppLayout>
                      <AppSidebar />
                      <Header />
                      <main> {children — rotas internas} </main>
                      <OnboardingTutorial />
                    </AppLayout>
                  </ProtectedRoute>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</App>
```

### 3.2 Componentes Reutilizáveis (shadcn/ui)

Total: **45+ componentes** em `src/components/ui/`. Todos seguem padrão:
- `React.forwardRef`
- `class-variance-authority` para variantes
- `cn()` utility para merge de classes
- Baseados em Radix UI primitives

**Componentes mais usados:**
| Componente | Uso principal |
|---|---|
| `Card / CardContent / CardHeader / CardTitle` | Containers em todas as páginas |
| `Button` | CTAs com variantes: default, ghost, outline, destructive |
| `Tabs / TabsList / TabsTrigger / TabsContent` | Navegação intra-página (Analytics, Biblioteca, etc) |
| `Dialog / DialogContent / DialogHeader` | Modais (criação, edição, confirmação) |
| `Input / Textarea / Select` | Formulários |
| `Badge` | Status, tags, categorias |
| `Slider` | Ajustes visuais (opacidade, escala, posição) |
| `Progress` | Barras de progresso |
| `Tooltip` | Hints contextuais |
| `ScrollArea` | Scroll customizado |
| `Accordion` | Seções expansíveis |
| `Sheet` | Side panels mobile |
| `Separator` | Divisores visuais |

### 3.3 Componente `cn()` — Merge de Classes

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 4. LAYOUT E NAVEGAÇÃO

### 4.1 AppLayout — Shell Principal

```text
┌──────────────────────────────────────────────────┐
│ Sidebar (240px / 48px collapsed)   │ Content     │
│                                    │             │
│  [Logo DQEF]                       │ Header 56px │
│  ─────────                         │ ─────────── │
│  Dashboard                         │             │
│  ★ Estratégia                      │  Main       │
│  ★ Fórum                           │  Content    │
│  Campanhas                         │  (scroll)   │
│  Kanban                            │  p-4 md:p-6 │
│  Calendário                        │             │
│  Biblioteca                        │             │
│  Analytics                         │             │
│  AI Criativo                       │             │
│  AI Carrosséis                     │             │
│  Video IA                          │             │
│  Formatos                          │             │
│  Criativos Ativos                  │             │
│  Canais Orgânicos                  │             │
│  Brand Kit                         │             │
│  ─────────                         │             │
│  [MVP v1.0]                        │             │
│  [◀ Collapse]                      │             │
└──────────────────────────────────────────────────┘
```

**Header (56px):**
- SidebarTrigger (hamburger)
- Título + subtítulo da página (dinâmico via `pageTitles`)
- HelpCircle (tutorial) com `animate-pulse-orange`
- Search icon (placeholder)
- Bell icon com dot vermelho
- Avatar circle com `gradient-orange` + primeira letra do email
- LogOut button

**Sidebar comportamento:**
- `collapsible="icon"` — colapsa para 48px mostrando só ícones
- Cookie `sidebar:state` persiste estado
- Atalho Ctrl/Cmd + B para toggle
- Mobile: Sheet off-canvas

### 4.2 Navegação — navItems (15 itens)

```typescript
const navItems = [
  { title: 'Dashboard',       url: '/',               icon: LayoutDashboard },
  { title: 'Estratégia',      url: '/estrategia',     icon: Target,           highlight: true },
  { title: 'Fórum',           url: '/forum',           icon: MessageSquareText, highlight: true },
  { title: 'Campanhas',       url: '/campanhas',       icon: Megaphone },
  { title: 'Kanban',          url: '/kanban',           icon: Trello },
  { title: 'Calendário',      url: '/calendario',       icon: CalendarDays },
  { title: 'Biblioteca',      url: '/biblioteca',       icon: BookOpen },
  { title: 'Analytics',       url: '/analytics',        icon: BarChart3 },
  { title: 'AI Criativo',     url: '/criativo',         icon: Sparkles },
  { title: 'AI Carrosséis',   url: '/ai-carrosseis',    icon: Layers },
  { title: 'Video IA',        url: '/video-ia',         icon: Clapperboard },
  { title: 'Formatos',        url: '/formatos',         icon: Ruler },
  { title: 'Criativos Ativos', url: '/criativos-ativos', icon: Image },
  { title: 'Canais Orgânicos', url: '/canais-organicos', icon: Globe },
  { title: 'Brand Kit',       url: '/brand-kit',        icon: Palette },
];
```

**Estilos de navegação:**
- `highlight: true` → borda laranja permanente (`border-primary/25 bg-primary/8`)
- Ativo → `bg-primary/15 text-primary shadow-sm`
- Normal → `text-sidebar-foreground hover:bg-sidebar-accent`
- Dot indicador: highlight=pulsante, active=sólido

### 4.3 Rotas (react-router-dom v6)

```typescript
// src/App.tsx — Nested routes
<Routes>
  <Route path="/auth" element={<Auth />} />
  <Route path="/*" element={
    <ProtectedRoute>
      <AppLayout>
        <Routes>
          <Route path="/"                element={<Index />} />
          <Route path="/kanban"          element={<Kanban />} />
          <Route path="/calendario"      element={<Calendario />} />
          <Route path="/biblioteca"      element={<Biblioteca />} />
          <Route path="/analytics"       element={<Analytics />} />
          <Route path="/campanhas"       element={<Campanhas />} />
          <Route path="/criativo"        element={<Criativo />} />
          <Route path="/ai-carrosseis"   element={<AiCarrosseis />} />
          <Route path="/video-ia"        element={<VideoIA />} />
          <Route path="/estrategia"      element={<Estrategia />} />
          <Route path="/forum"           element={<Forum />} />
          <Route path="/formatos"        element={<Formatos />} />
          <Route path="/criativos-ativos" element={<CriativosAtivos />} />
          <Route path="/canais-organicos" element={<CanaisOrganicos />} />
          <Route path="/brand-kit"       element={<BrandKit />} />
          <Route path="/relatorio"       element={<RelatorioPlataforma />} />
          <Route path="*"               element={<NotFound />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  } />
</Routes>
```

---

## 5. AUTENTICAÇÃO

### 5.1 Fluxo de Login

```text
Usuário digita username + senha
    ↓
POST /functions/v1/login-lookup { username }
    ↓ retorna email
supabase.auth.signInWithPassword({ email, password })
    ↓
AuthContext.user → ProtectedRoute libera acesso
```

**Não existe signup público.** Apenas login por username pré-cadastrado na tabela `profiles`.

### 5.2 AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

- Escuta `onAuthStateChange` para SSO/tokens
- Inicializa com `getSession()` para sessão persistida
- `signOut()` limpa sessão

### 5.3 ProtectedRoute

```typescript
// Se loading: Spinner centralizado
// Se !user: Navigate → /auth
// Se user: render children
```

### 5.4 Página de Login (Auth.tsx)

Layout split-screen:
- **Esquerda (lg+):** Branding panel com logo, tagline "Sua operação de marketing centralizada", 4 feature cards
- **Direita:** Form com username + password, botão gradient-orange
- **Mobile:** Logo centralizado + form

---

## 6. PÁGINAS — DETALHAMENTO VISUAL

### 6.1 Dashboard (Index.tsx) — ~960 linhas

**Layout:** `space-y-5 animate-fade-in`

**Seções (de cima para baixo):**
1. **Header:** Seletor de período (7d / 30d / 90d) com toggle estilizado
2. **Health Score + KPIs:** Card com SVG circular + grid 5×2 de KpiCards
3. **Revenue Chart:** AreaChart (receita vs meta vs custo) — Recharts
4. **Dual Funnel:** Cliente × Prestador lado a lado com barras coloridas
5. **AI Insights:** Cards expansíveis com ImpactBadge (Alto/Médio/Oportunidade)
6. **Marketplace Liquidity:** Gauge visual + métricas
7. **Team Workload:** Cards por membro + LineChart velocidade semanal
8. **Bottlenecks:** Lista com SeverityDot + owner + dias
9. **Goals + ROAS:** GoalBars + BarChart horizontal
10. **Upcoming Content:** Lista de próximos conteúdos do calendário
11. **Quick Actions:** Botões de navegação rápida

**Sub-componentes locais:**
- `HealthScoreCircle` — SVG radial com stroke-dasharray animado
- `KpiCard` — Card com ícone, valor, delta (↑↓), cor contextual
- `GoalBar` — Barra de progresso com label/current/target
- `SeverityDot` — Dot colorido (high=red, medium=amber, low=orange)
- `ImpactBadge` — Badge com borda e cor por impacto
- `FunnelColumn` — Barras horizontais com % de conversão

### 6.2 Estratégia (Estrategia.tsx) — ~1462 linhas

**3 abas principais:**
1. **Playbook:** 9 seções editáveis (positioning, differentials, etc) com localStorage
2. **Knowledge Base:** Upload de documentos → análise IA → knowledge extraída (Supabase)
3. **Benchmarks:** Upload de peças concorrentes → análise IA (Supabase)

**Meta-Fields:** Painel lateral com campos extraídos por IA:
- brandEssence, uniqueValueProp, targetPersona, toneRules, keyMessages, painPoints, etc.
- `completenessScore` com barra de progresso

**Persistência:** `localStorage('dqef_strategy_v1')` + `localStorage('dqef_strategy_metafields_v1')` + Supabase (`strategy_knowledge`, `competitor_benchmarks`)

### 6.3 Kanban (Kanban.tsx) — ~1965 linhas

**Colunas:** pending → in_progress → in_review → approved → done
**DnD:** @dnd-kit/core + @dnd-kit/sortable
**Cards:** Campaign cards + creative task cards (Supabase `campaign_tasks`)
**Team:** 5 membros hardcoded (Gabriel, Guilherme, Marcelo, Leandro, Gustavo)
**Ações:** Edit, approve, reject, assign, create subtasks, link to creative tools

### 6.4 AI Criativo (Criativo.tsx) — ~2425 linhas

**Workflow:**
1. Input: referência (texto/imagem/HTML estratégico)
2. Configuração: angle, channel, format, theme, shape
3. Geração: arte única ou 15 variações
4. Edição: headline, subtext, CTA, imagem, posição
5. Export: PNG individual ou ZIP em lote

**Componentes filhos:**
- `VariationsGrid` (~1457 linhas) — Grid de variações com preview + export
- `AdjSlider` — Slider de ajuste numérico
- `BenchmarkPanel` — Painel de benchmarks
- `DataSciencePanel` — Análise de dados
- `StrategyContextPanel` — Contexto estratégico

### 6.5 AI Carrosséis (AiCarrosseis.tsx) — ~4208 linhas

**2 modos:**
- **Direto:** 5 slides, copy + image prompt por slide
- **Narrativa:** 7-10 slides com arco dramático, research, fact-checking

**Sub-componentes locais:**
- `ThemePicker` — Seleção de tema visual
- `SlidePreview` — Preview de slide com scaling responsivo
- `SlideCard` — Card editável por slide
- `StrategyInputSection` — Inputs estratégicos
- `MediaLibraryPanel` — Biblioteca de mídia inline
- `DraftsPanel` — Rascunhos salvos no DB

### 6.6 Analytics (Analytics.tsx) — ~890+ linhas

**6 abas:**
1. **Operacional** → `BrazilHeatmap` (SVG mapa do Brasil + KPIs)
2. **Saúde Financeira** → `FinancialHealthTab` (unit economics, waterfall, MRR)
3. **Funis End-to-End** → `FunnelEndToEnd` (Meta + Google + GA4 3D funnels)
4. **GA4** → `GA4Tab` (sessões, bounce rate, top sources, devices)
5. **Meta Ads** → `MetaAdsRealTab` (dados reais via API Meta)
6. **Relatórios CMO** → `CMOReportsTab` (upload PDF + análise IA)

**AI Diagnosis:** Dialog com análise IA do analytics geral

### 6.7 Outras Páginas

| Página | Linhas aprox. | Características visuais |
|---|---|---|
| Campanhas | ~800 | CRUD completo, wizard de criação, plano IA |
| Calendário | ~400 | Grid mensal, side panel, modal criação |
| Biblioteca | ~700 | Tabs: Mídias (upload), Ideação (IA), Copies, Roteiros |
| Forum | ~500 | Chat realtime, mensagens fixadas, IA inline |
| Video IA | ~600 | Pipeline 5 etapas, storyboard, projetos salvos |
| Formatos | ~600 | Guia de dimensões por plataforma, export TXT |
| Criativos Ativos | ~400 | Galeria com KPIs, upload, filtros |
| Canais Orgânicos | ~560 | Tabs por plataforma, Instagram real + mocks |
| Brand Kit | ~400 | Assets, cores, fontes, upload |
| Relatório | ~400 | Relatório executivo, export PDF |

---

## 7. PADRÕES DE CÓDIGO

### 7.1 Padrão de Página

```typescript
// Toda página segue este padrão:
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
// ... lucide icons

export default function NomeDaPagina() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // fetch data
  useEffect(() => { /* load from supabase */ }, [user]);
  
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Conteúdo */}
    </div>
  );
}
```

### 7.2 Padrão de Card (KPI)

```tsx
<Card className="border-border bg-card hover:border-primary/30 transition-all duration-200">
  <CardContent className="p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="rounded-xl p-2.5 bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-xs font-semibold text-green-400">+12%</span>
    </div>
    <p className="text-2xl font-black text-foreground tracking-tight">4.550</p>
    <p className="text-xs text-muted-foreground mt-0.5">Label</p>
  </CardContent>
</Card>
```

### 7.3 Padrão de Tabs

```tsx
<Tabs defaultValue="tab1" className="space-y-4">
  <TabsList className="bg-card border border-border">
    <TabsTrigger value="tab1">Aba 1</TabsTrigger>
    <TabsTrigger value="tab2">Aba 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">...</TabsContent>
  <TabsContent value="tab2">...</TabsContent>
</Tabs>
```

### 7.4 Padrão de Badge de Status

```tsx
// Status badges seguem este padrão:
const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-500/15 text-gray-400 border-gray-500/30',
  review:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  active:    'bg-teal/15 text-teal border-teal/30',
  published: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

<Badge className={cn('text-[9px] font-bold uppercase', STATUS_STYLES[status])}>
  {status}
</Badge>
```

### 7.5 Padrão de Upload

```tsx
// Drag-and-drop zone padrão
<div
  className="border-2 border-dashed border-border rounded-xl p-8 text-center 
             hover:border-primary/50 transition-colors cursor-pointer"
  onDragOver={e => { e.preventDefault(); }}
  onDrop={handleDrop}
  onClick={() => inputRef.current?.click()}
>
  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
  <p className="text-sm text-muted-foreground">Arraste ou clique</p>
  <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
</div>
```

### 7.6 Padrão de Seletor de Período

```tsx
<div className="flex items-center rounded-lg border border-border bg-card p-0.5 gap-0.5">
  {(['7d', '30d', '90d'] as const).map(p => (
    <button
      key={p}
      onClick={() => setPeriod(p)}
      className={cn(
        'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
        period === p
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
    </button>
  ))}
</div>
```

---

## 8. ASSETS VISUAIS

### 8.1 Logo SVG

```text
Arquivo: src/assets/logo.svg
Formato: SVG path único
Cor: #FE5937 (laranja-vermelho)
Dimensões: 3206 × 3168 viewBox
Uso: Sidebar, Login, Brand Kit
```

**NOTA:** `logo.svg` e `dqf-icon.svg` são o MESMO arquivo (mesmo path SVG com cor #FE5937).

### 8.2 Ícones

Lucide React v0.462.0 — todos os ícones são importados individualmente:
```typescript
import { LayoutDashboard, Target, Sparkles, ... } from 'lucide-react';
```

Tamanhos padrão:
- Sidebar: `h-4 w-4`
- KPI cards: `h-5 w-5`
- Headers: `h-4 w-4`
- Botões: `h-4 w-4`
- Onboarding: `h-8 w-8` a `h-12 w-12`

---

## 9. HOOKS CUSTOMIZADOS

| Hook | Arquivo | Função |
|---|---|---|
| `useAuth()` | `src/contexts/AuthContext.tsx` | User, session, loading, signOut |
| `useCampaigns()` | `src/hooks/useCampaigns.ts` | CRUD campanhas → Supabase `campaigns` |
| `useCalendarContents()` | `src/hooks/useCalendarContents.ts` | CRUD conteúdos → Supabase `calendar_contents` |
| `useLocalStorage()` | `src/hooks/useLocalStorage.ts` | useState + localStorage sync |
| `useToast()` | `src/hooks/use-toast.ts` | Sistema de toasts (Radix) |
| `useIsMobile()` | `src/hooks/use-mobile.tsx` | Media query hook |

---

## 10. DADOS PERSISTIDOS EM LOCALSTORAGE

| Chave | Página | Tipo | Descrição |
|---|---|---|---|
| `dqef_strategy_v1` | Estratégia | JSON (StrategyData) | Playbook 9 seções |
| `dqef_strategy_metafields_v1` | Estratégia | JSON (MetaFields) | Meta-Fields extraídos por IA |
| `dqef_tutorial_completed` | Global | "true" | Tutorial concluído |
| `sidebar:state` | Global | "true"/"false" (cookie) | Estado da sidebar |
| `igProfile` | Canais Orgânicos | JSON | Cache perfil Instagram |
| `dqef_criativo_ref_*` | AI Criativo | string | Referência passada entre módulos |

---

## 11. COMUNICAÇÃO COM BACKEND (SUPABASE)

### 11.1 Client

```typescript
// src/integrations/supabase/client.ts (AUTO-GERADO — NUNCA EDITAR)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY);
```

### 11.2 Padrão de chamada a Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('nome-da-funcao', {
  body: { param1, param2 },
});
if (error) throw error;
```

### 11.3 Padrão de query ao banco

```typescript
const { data, error } = await supabase
  .from('tabela')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

### 11.4 Padrão de upload ao Storage

```typescript
const filePath = `${user.id}/${Date.now()}_${file.name}`;
const { error } = await supabase.storage
  .from('media-library')
  .upload(filePath, file, { cacheControl: '3600', upsert: false });

const { data: { publicUrl } } = supabase.storage
  .from('media-library')
  .getPublicUrl(filePath);
```

### 11.5 Realtime (Fórum)

```typescript
supabase
  .channel('forum-messages')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'forum_messages',
  }, (payload) => { /* handle */ })
  .subscribe();
```

---

## 12. EXPORT DE CRIATIVOS (html-to-image)

### 12.1 Export PNG Individual

```typescript
import { toPng } from 'html-to-image';

const dataUrl = await toPng(nodeRef.current, {
  width: format.width,    // ex: 1080
  height: format.height,  // ex: 1350
  pixelRatio: 3,          // 3x para alta resolução
  backgroundColor: theme.bgColor,
});

const link = document.createElement('a');
link.download = `criativo_${Date.now()}.png`;
link.href = dataUrl;
link.click();
```

### 12.2 Export ZIP em Lote

```typescript
import JSZip from 'jszip';
import { toPng } from 'html-to-image';
import { createRoot } from 'react-dom/client';

const zip = new JSZip();
for (const variation of selected) {
  // Monta componente offscreen
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;width:${format.width}px;height:${format.height}px`;
  document.body.appendChild(container);
  
  const root = createRoot(container);
  root.render(<CreativeCanvas variation={variation} format={format} theme={theme} exportMode />);
  
  await new Promise(r => setTimeout(r, 300));
  const dataUrl = await toPng(container, { width: format.width, height: format.height, pixelRatio: 3 });
  
  const base64 = dataUrl.split(',')[1];
  zip.file(`${variation.id}.png`, base64, { base64: true });
  
  root.unmount();
  container.remove();
}

const blob = await zip.generateAsync({ type: 'blob' });
// download blob
```

---

## 13. CONFIGURAÇÕES NECESSÁRIAS PARA REPLICAÇÃO

### 13.1 Variáveis de Ambiente (.env)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=seu-project-ref
```

### 13.2 shadcn/ui Config

```json
// components.json
{
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 13.3 Checklist de Replicação Visual

1. [ ] Instalar todas as 45+ dependências do `package.json`
2. [ ] Copiar `src/index.css` exatamente (variáveis CSS são a alma do design)
3. [ ] Copiar `tailwind.config.ts` (cores, animações, breakpoints)
4. [ ] Copiar todos os 45+ componentes de `src/components/ui/`
5. [ ] Copiar `src/lib/utils.ts` (função `cn()`)
6. [ ] Copiar assets: `src/assets/logo.svg`, `src/assets/dqf-icon.svg`
7. [ ] Adicionar font Inter via Google Fonts no `index.html`
8. [ ] Configurar Vite com alias `@` → `src`
9. [ ] Configurar Supabase client com variáveis de ambiente
10. [ ] Manter `components.json` para shadcn CLI funcionar

### 13.4 Ordem de Construção Recomendada

```text
1. Setup Vite + React + TS + Tailwind
2. Copiar design tokens (index.css + tailwind.config.ts)
3. Instalar + copiar shadcn/ui components
4. Montar AppLayout + AppSidebar + AuthContext
5. Criar página Auth (login)
6. Criar Dashboard (Index.tsx)
7. Criar Estratégia (mais complexa, base para outras)
8. Criar Kanban + Campanhas + Calendário
9. Criar AI Criativo + AI Carrosséis (mais complexas ~2400-4200 linhas cada)
10. Criar Analytics (6 sub-componentes)
11. Criar demais páginas
12. Conectar todas as Edge Functions
```

---

## 14. PONTOS DE ATENÇÃO PARA O DEV

### 14.1 Componentes Extremamente Grandes

| Arquivo | Linhas | Recomendação |
|---|---|---|
| `AiCarrosseis.tsx` | ~4208 | Quebrar em 8-10 componentes menores |
| `Criativo.tsx` | ~2425 | Quebrar em 5-6 componentes |
| `Kanban.tsx` | ~1965 | Quebrar em 4-5 componentes |
| `VariationsGrid.tsx` | ~1457 | Quebrar em 3-4 componentes |
| `Estrategia.tsx` | ~1462 | Quebrar em 4-5 componentes |

### 14.2 Dependências entre Páginas

```text
Estratégia (localStorage) ──→ AI Criativo (lê metafields)
                          ──→ AI Carrosséis (lê strategy + KB docs)
                          ──→ Campanhas (lê strategy para plano IA)
                          ──→ Video IA (lê strategy)

Campanhas (Supabase) ──→ Kanban (lê campaigns + tasks)
                     ──→ Calendário (lê tasks por deadline)

Biblioteca (Supabase) ──→ AI Carrosséis (media_library para slides)
                      ──→ AI Criativo (media_library para imagens)

Analytics ──→ Dashboard (métricas derivadas)
```

### 14.3 Padrões Visuais Recorrentes

- **Todos os cards:** `border-border bg-card` (cinza escuro com borda sutil)
- **Hover em cards:** `hover:border-primary/30` (borda laranja sutil)
- **Ícones em círculos:** `rounded-xl p-2.5 bg-{cor}/10` com ícone `h-5 w-5 text-{cor}`
- **Textos de valor:** `text-2xl font-black text-foreground tracking-tight`
- **Labels:** `text-xs text-muted-foreground`
- **Deltas positivos:** `text-green-400` com `ArrowUpRight`
- **Deltas negativos:** `text-red-400` com `ArrowDownRight`
- **Botões primários:** `gradient-orange text-white` ou `bg-primary text-primary-foreground`
- **Badges de tipo:** `text-[9px] font-bold uppercase tracking-wider`
- **Espaçamento entre seções:** `space-y-5` ou `space-y-4`
- **Animação de entrada:** `animate-fade-in` (0.25s ease-out)

---

*Relatório gerado em 2026-04-04. Este documento + o relatório backend formam a documentação completa para replicação da plataforma DQEF Marketing Hub.*
