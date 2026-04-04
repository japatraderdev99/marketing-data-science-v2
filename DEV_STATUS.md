# DQEF Studio v2 — Status de Desenvolvimento

> Arquivo de contexto para continuidade entre sessões. Consulte sempre antes de continuar.

## Projeto

Plataforma de marketing com IA para autônomos brasileiros. Reescrita modular do projeto original (monolítico, 4000+ linhas por arquivo).

**Diretório do app:** `marketing-platform-v2-final/app/`
**Referência original:** `marketing-planner-main NEW/` (versão mais recente, páginas monolíticas)
**Referência modular:** `marketing-data-science-main/` (melhor estrutura de componentes)

## Stack Atual

- React 19 + Vite 8 + TypeScript 5.9 + Tailwind CSS 4
- Supabase (auth, storage, edge functions, postgres)
- TanStack Query, React Router 7, Lucide, html-to-image, JSZip, Sonner
- Fontes: Montserrat (heading), Inter (body)

## Estrutura de Pastas (app/src/)

```
src/
├── types/index.ts           ← tipos compartilhados (slide, carousel, batch, media, draft)
├── lib/
│   ├── utils.ts             ← cn(), extractJSON(), generateId(), formatCurrency()
│   ├── supabase.ts          ← client (placeholder URL quando sem env vars)
│   └── ai.ts                ← callAI(), generateCarouselVisual(), generateNarrativeCarousel()
├── hooks/
│   ├── useCarouselGeneration.ts
│   └── useNarrativeGeneration.ts
├── components/layout/
│   ├── Sidebar.tsx           ← nav lateral fixa, colapsável
│   └── AppLayout.tsx         ← shell com sidebar + main
├── features/
│   ├── carousel/
│   │   ├── constants.ts      ← ANGLES, PERSONAS, CHANNELS, TONES, THEMES, FORMATS, STYLES
│   │   ├── DirectCarousel.tsx ← modo 5 slides (input + preview + export)
│   │   ├── NarrativeCarousel.tsx ← modo 7-10 slides editorial
│   │   └── components/
│   │       ├── SlidePreview.tsx         ← renderiza 1 slide com tema
│   │       ├── SlideCard.tsx            ← slide + painel de edição
│   │       ├── NarrativeSlidePreview.tsx ← slide narrativo com body/source
│   │       ├── AdjSlider.tsx            ← slider com label + valor (escala/percentual)
│   │       ├── ShapeOverlay.tsx         ← 6 shape overlays (pill, box, diagonal, etc)
│   │       ├── WordHighlight.tsx        ← WordSelector + HighlightStylePicker + renderHighlightedText
│   │       ├── SlideControls.tsx        ← painel completo: sliders + shapes + fonts + highlights
│   │       ├── AngleSelector.tsx
│   │       ├── ThemeSelector.tsx
│   │       ├── CarouselInputPanel.tsx   ← briefing + angle + persona + canal + tom
│   │       └── BatchExportButton.tsx    ← export ZIP de todos os slides
│   ├── criativo/
│   │   ├── CriativoBatch.tsx  ← geração batch com per-variation controls + mass controls
│   │   ├── VariationCard.tsx  ← card individual com sliders, edição, shapes, highlight
│   │   └── MassControls.tsx   ← toolbar de controles em massa (selecionar, aplicar, exportar)
│   └── media/
│       └── MediaLibrary.tsx   ← upload + tagging simulado + filtros + grid
├── pages/
│   ├── Dashboard.tsx
│   ├── AiCarrosseis.tsx       ← toggle direto/narrativo
│   ├── Criativo.tsx
│   ├── Biblioteca.tsx
│   ├── Analytics.tsx          ← placeholder
│   ├── Campanhas.tsx          ← placeholder
│   └── Estrategia.tsx         ← placeholder
└── App.tsx                    ← router + QueryProvider + ErrorBoundary
```

## Edge Functions (supabase/functions/)

```
├── ai-router/             ← dispatcher central (OpenRouter + Lovable fallback)
├── generate-carousel-visual/ ← 5 slides diretos via Claude Sonnet
├── generate-narrative-carousel/ ← 7-10 slides editoriais via Claude Opus
└── tag-media/             ← auto-tagging de imagens via Gemini Vision
```

## O Que Já Funciona

- [x] App shell com sidebar, routing, lazy loading, error boundary
- [x] Dashboard com quick actions, hero banner, stats placeholder
- [x] Carrossel Direto: input panel, geração via edge function, preview com 3 temas, edição inline, export PNG/ZIP, **per-slide settings (sliders, shapes, highlights)**
- [x] Carrossel Narrativo: input, geração, preview grid, edição, export ZIP, **per-slide sliders (text scale, opacity, zoom)**
- [x] Criativo Batch: briefing, ângulos, nichos, estilos visuais, variações (2-6), geração paralela em chunks, grid de previews, export ZIP, **per-variation controls (SlideControls), mass controls toolbar, selection system, batch export**
- [x] **Slide Editor avançado**: SlidePreview com SlideSettings (textScale, ctaScale, textPositionX/Y, imageOpacity, imageZoom, imageOffsetY, shape, highlight, font)
- [x] **Shape Overlays**: 6 tipos (none, pill, box, diagonal, gradient-bar, circle-accent) renderizados no preview e no export
- [x] **Word Highlight System**: WordSelector (clique para selecionar palavras), 4 estilos (none, color, bold, box), color picker
- [x] **Seletor de Fonte**: 6 fontes (Montserrat, Oswald, Bebas Neue, Anton, Teko, Inter)
- [x] **Controles em Massa**: slider texto/CTA/posição, shape/highlight/font para todos, CTA em massa, seleção múltipla, export selecionados
- [x] Biblioteca de Mídia: upload drag & drop, tagging simulado, filtros (mood, style), grid, detail panel com fit_score
- [x] Edge functions: ai-router, generate-carousel-visual, generate-narrative-carousel, tag-media
- [x] Build TypeScript compila sem erros
- [x] Dev server funcional (via dev.mjs com process.chdir)

## O Que Falta — Baseado na Análise da Ferramenta Original

### PRIORIDADE ALTA (Features core da experiência Canva-like)

1. ~~**Slide Editor Avançado**~~ ✅ DONE — SlideControls com todos os sliders, shapes, fonts, highlights
2. ~~**Shape Overlays**~~ ✅ DONE — ShapeOverlay com 6 estilos, renderiza no preview e export
3. ~~**Controles em Massa**~~ ✅ DONE — MassControls toolbar + seleção + batch export
4. ~~**Seletor de Fonte**~~ ✅ DONE — 6 fontes no SlideControls e MassControls

5. **Gerenciamento de Imagem por Slide**
   - "Gerar IA" botão (chama edge function de image)
   - "Upload" do dispositivo
   - "Trocar imagem" (da biblioteca)
   - "Tirar imagem" (remover)
   - Prompt personalizado PT→EN com "Traduzir e Gerar"

6. **Seletor de Formato**
   - Grid por plataforma: Instagram (Feed 4:5, 3:4, 1:1, Stories, Paisagem), TikTok, Facebook, LinkedIn, Google Display, YouTube
   - Formato selecionado exibido abaixo: "Instagram · Feed 4:5 · 1080×1350px · 4:5"
   - Preview e export mudam dimensões conforme formato

### PRIORIDADE MÉDIA

7. **Tabs no Carrossel**: Briefing | Estratégia | Biblioteca | Drafts
8. **Fundação Estratégica**: Toggle para injetar knowledge base (docs listados), tabs: Essência, Posicionamento, Tom, Persona, System Prompt
9. **Revisão Estratégica**: Botão que roda análise da estratégia antes de gerar
10. **Salvar/Carregar Rascunho** + "Salvar Rascunho" no header
11. **Botão Canvas** no header (link para Canva-like editor externo?)
12. **Caption por slide** com botão Copy
13. **Lógica viral** exibida com badge colorido
14. **Per-slide actions**: "Menos texto", "Mudar abordagem", "PNG"

### PRIORIDADE BAIXA

15. **Analytics completo**: tabs Operacional, Saúde Financeira, Funil E2E, GA4, Meta Ads, Relatórios CMO
16. **Dashboard operacional**: Health Score, métricas LIVE do Firestore, mapa do Brasil, ranking cidades
17. **Campanhas CRUD**
18. **Estratégia de Marca** (upload + extração IA)

## Design Tokens — Referência da Ferramenta Original

```
Background: #0A0A0B (surface principal)
Surface elevated: #141416 (cards, paineis)
Surface hover: #1A1A1E
Border: #2A2A2E
Brand: #E8603C (laranja coral — botões, highlights, accent)
Brand dark: #C94E2E
Text primary: #FAFAFA
Text secondary: #A0A0A8
Text muted: #6B6B73
Heading font: Montserrat 900, UPPERCASE
Body font: Inter/system
CTA button: bg-brand, text-white, rounded, "SAIBA MAIS"
Slogan: "pronto. resolvido." sempre no slide CTA
```

## Como Rodar

```bash
cd marketing-platform-v2-final/app
export PATH="/usr/local/bin:$PATH"
npx vite --host
# ou: node dev.mjs
```

**Nota:** `/usr/local/bin/node` e `/usr/local/bin/npm` existem mas NÃO estão no PATH padrão do shell. Sempre exportar PATH antes de usar.

**Preview tool (launch.json):** usa `dev.mjs` que faz `process.chdir(__dirname)` antes de iniciar Vite.

## Env Vars Necessárias (.env)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Sem essas vars, o app roda com placeholder e não faz chamadas reais ao Supabase.

## Regras do Projeto (CLAUDE.md)

- **Max 400 linhas por arquivo** (páginas max 100)
- Feature-based folder structure
- React Query para server state (nunca useState+fetch)
- Hook centralizado `useAI()` — chaves nunca no frontend
- Zero localStorage — tudo no Supabase
- Tipos em `src/types/index.ts`
- Lazy loading em todas as páginas
- Erros em português

## Próximos Passos (ordem recomendada)

1. Implementar gerenciamento de imagem por slide (gerar IA, upload, trocar, tirar)
2. Adicionar seletor de formato com preview dinâmico (dimensões mudam conforme formato)
3. Adicionar tabs Briefing/Estratégia/Biblioteca/Drafts no Carrossel
4. Fundação Estratégica toggle com knowledge base
5. Salvar/Carregar rascunhos (CreativeDraft)
6. Per-slide actions: "Menos texto", "Mudar abordagem", "PNG individual"
7. Conectar com Supabase real para persistência
8. Implementar Analytics com dados reais
