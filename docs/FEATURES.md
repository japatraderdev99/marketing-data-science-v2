# Features — Especificação Completa

## Phase 1 — MVP (implementar agora)

### F1. Autenticação & Workspace

**Descrição:** Login/registro + setup inicial do workspace e marca.

**Fluxo:**
1. Usuário acessa → redireciona para `/auth` se não autenticado
2. Login/Registro com email via Supabase Auth
3. Primeiro acesso → onboarding: nome do workspace, nicho, cor da marca
4. Após setup → redireciona para dashboard

**Componentes:**
- `features/auth/components/LoginForm.tsx` — email/password + Google OAuth
- `features/auth/components/WorkspaceSetup.tsx` — formulário de onboarding
- `features/auth/hooks/useAuth.ts` — sessão, login, logout, loading

**Dados salvos:**
- `auth.users` (Supabase Auth)
- `profiles` (trigger automático)
- `workspaces` (owner_id + nome + nicho)
- `workspace_members` (owner com role 'owner')

---

### F2. Estratégia de Marca

**Descrição:** Setup do DNA da marca que será injetado em todos os prompts de IA.

**Fluxo:**
1. Usuário acessa `/estrategia`
2. Pode inserir texto livre ou fazer upload de PDF/documento
3. Clica "Extrair com IA" → chama `ai-router` com task_type 'analyze'
4. IA extrai campos estruturados
5. Usuário revisa e edita campos manualmente
6. Salva em `strategy_knowledge`

**Campos extraídos:**
- Nome da marca
- Essência da marca (1 frase)
- Posicionamento
- Proposta de valor única
- Tom de voz
- Público-alvo
- 3-5 mensagens-chave
- Tópicos proibidos
- Estilo de CTA
- `promptContext` — parágrafo que será injetado direto nos prompts

**Componentes:**
- `features/strategy/components/BrandSetupForm.tsx`
- `features/strategy/components/MetafieldsEditor.tsx`
- `features/strategy/hooks/useStrategy.ts`

---

### F3. Campanhas

**Descrição:** CRUD simples de campanhas para organizar os criativos.

**Campos:**
- Nome (obrigatório)
- Objetivo: Awareness / Engajamento / Conversão / Retenção
- Canal principal: Instagram / TikTok / LinkedIn / Google / Facebook
- Budget mensal (opcional)
- Período: início e fim (opcional)
- Briefing/contexto (texto livre — injetado nos prompts de IA)
- Status: Ativa / Pausada / Encerrada

**Componentes:**
- `features/campaigns/components/CampaignCard.tsx`
- `features/campaigns/components/CampaignForm.tsx`
- `features/campaigns/components/CampaignList.tsx`
- `features/campaigns/hooks/useCampaigns.ts`

---

### F4. AI Carrossel

**Descrição:** Geração de carrosséis para Instagram/LinkedIn/TikTok com 2 modos.

#### Modo Direto (5 slides)

**Inputs:**
- Contexto/briefing (textarea)
- Angle emocional: IA Decide / RAIVA / DINHEIRO / ORGULHO / URGÊNCIA / ALÍVIO
- Persona (dropdown de arcétipos)
- Canal (Instagram Feed / Stories / TikTok / LinkedIn / Facebook)
- Tom: Peer-to-peer / Editorial / Direto ao ponto
- Campanha (opcional — injeta context da campanha)

**Output por slide:**
- Type (hook/setup/data/contrast/validation/cta) com badge colorido
- Headline UPPERCASE com palavra de destaque
- Subtext (opcional)
- Direção visual + imagePrompt
- Botão "Buscar na biblioteca" → matching por angle + tags
- Botão "Gerar imagem" → flux-1.1-pro se não encontrou na biblioteca

**Preview:**
- 3 temas: brand-orange (#E8603C), clean-white, dark-premium
- Controles: opacidade da imagem, posição do texto, escala do headline
- Formato: 16 opções (Instagram 4:5, 3:4, 1:1, Stories, TikTok, LinkedIn, etc.)

**Ações:**
- Salvar draft → `creative_drafts` (type: 'carousel_direct')
- Export PNG (slide por slide via html-to-image)
- Export ZIP (todos os slides)

#### Modo Narrativa (7-10 slides)

**Inputs:**
- Tópico (o que contar)
- Angle da audiência (como enquadrar)
- Tom
- Número de slides (7-10)
- Dados de pesquisa (opcional)
- Citações/fontes (opcional)

**Output:**
- Arco narrativo: Hook → Context → Data/Tension → Virada → Prova → CTA
- Por slide: headline, body text, sourceLabel, imagePrompt, cores

**Preview:** temas editoriais (editorial-dark, editorial-cream, brand-bold)

#### Painel de Drafts

- Lista os últimos 20 drafts do workspace
- Thumbnail do primeiro slide
- Ações: carregar, duplicar, deletar

**Componentes:**
- `features/carousel/components/SlideCard.tsx`
- `features/carousel/components/SlidePreview.tsx`
- `features/carousel/components/NarrativeSlideCard.tsx`
- `features/carousel/components/NarrativeSlidePreview.tsx`
- `features/carousel/components/DraftsPanel.tsx`
- `features/carousel/components/AngleSelector.tsx`
- `features/carousel/components/ThemeSelector.tsx`
- `features/carousel/components/BatchExportButton.tsx`
- `features/carousel/hooks/useCarouselGeneration.ts`
- `features/carousel/hooks/useCarouselDrafts.ts`

---

### F5. Criativo em Lote (Batch)

**Descrição:** Gerar N variações de criativo estático com estilos diferentes,
aproveitando imagens da biblioteca de mídia.

**Inputs:**
- Briefing (texto livre)
- Angle emocional (mesmo sistema do carrossel)
- Canal
- Objetivo da campanha
- Nicho(s) — múltipla seleção: Piscineiro, Eletricista, Encanador, Marido de aluguel, etc.
- Quantidade de variações: 2 / 3 / 4 / 6 / 15
- Modo referência: upload de imagem → IA analisa → gera variações baseadas no estilo

**6 Estilos Visuais pré-definidos (ciclo automático):**
1. Impacto Direto — urgência máxima, bold, forma pill
2. Documental — autenticidade, foto dominante, texto mínimo
3. Social Proof — prova social, box de citação, forma box
4. Provocação — indignação, contraste alto, forma diagonal
5. Minimalista — elegância, clean, espaço negativo
6. Custom — definido pelo usuário

**Fluxo de geração:**
1. Usuário preenche inputs → clica "Gerar X variações"
2. Progresso em tempo real: "Gerando 3 de 6..."
3. Para cada variação:
   a. Edge function gera copy + suggested_tags + imagePrompt
   b. Frontend busca imagem na biblioteca por matching (angle + tags)
   c. Se encontrou (score ≥ 0.6): usa imagem da biblioteca
   d. Se não encontrou: exibe placeholder + botão "Gerar imagem"
4. Exibe grid de variações com preview

**Por variação (editável):**
- Headline (inline edit)
- Subtext (inline edit)
- CTA (inline edit)
- Imagem (trocar por outra da biblioteca ou gerar)
- Estilo visual (trocar manualmente)

**Ações:**
- Salvar lote como draft → `creative_drafts` (type: 'batch')
- Export individual (PNG) por variação
- Export em lote → ZIP com todas as variações

**Componentes:**
- `features/criativo/components/CreativePreview.tsx`
- `features/criativo/components/VariationCard.tsx`
- `features/criativo/components/BatchControls.tsx`
- `features/criativo/components/StyleSelector.tsx`
- `features/criativo/components/ExportPanel.tsx`
- `features/criativo/hooks/useBatchGeneration.ts`

---

### F6. Biblioteca de Mídia

Documentação completa em `docs/MEDIA_LIBRARY.md`.

**Resumo:**
- Upload de imagens com drag & drop
- Tagging automático via IA (gemini-2.5-flash vision)
- Tags semânticas: mood, subjects, colors, style
- fit_score_map por emotional angle
- Busca por texto + filtros (mood, style, category, angle)
- Integração com geração de criativos (matching antes de gerar nova)

---

### F7. Analytics Dashboard

**Descrição:** Dados de performance de campanhas Meta Ads e GA4.

**Tabs:**
1. **Meta Ads** — impressões, cliques, gasto, CTR, CPC, CPM, conversões por anúncio e campanha
2. **GA4** — sessões, usuários, bounce rate, conversões por canal e dispositivo
3. **Financial Health** — ROI combinado, ROAS, gasto por canal, eficiência

**Período seletável:** 7 dias / 30 dias / 90 dias

**Score criativo (Meta Ads):**
```
score = CTR_normalizado * 0.30
      + CPC_invertido_normalizado * 0.20
      + conversoes_normalizadas * 0.30
      + eficiencia_normalizada * 0.20

Legenda: Excelente (80+) | Bom (60+) | Regular (40+) | Fraco (<20)
```

**Botão "Sincronizar":** aciona `sync-meta-insights` e `sync-ga4`.

**Gráficos:**
- Área: evolução de métricas ao longo do tempo
- Barras: comparativo por campanha / canal
- Pizza: distribuição por dispositivo / canal

**Componentes:**
- `features/analytics/components/MetaAdsTab.tsx`
- `features/analytics/components/GA4Tab.tsx`
- `features/analytics/components/FinancialHealthTab.tsx`
- `features/analytics/components/CreativeScoreCard.tsx`
- `features/analytics/hooks/useMetaAds.ts`
- `features/analytics/hooks/useGA4.ts`

---

### F8. Criativos Ativos

**Descrição:** Lista de anúncios ativos na Meta com score de performance,
para identificar o que otimizar.

**Dados:** vindos de `meta_ads_performance` com joins para calcular scores.

**Filtros:** campanha, período, score mínimo.

**Ação chave:** botão "Criar variação" em cada anúncio → abre Criativo Batch
pré-preenchido com o contexto do anúncio (para testar variações do que está rodando).

---

## Phase 2 — Próximas features (não implementar agora)

- **VideoIA** — geração de storyboard + frames + motion prompts
- **Kanban** — gestão de conteúdo em board
- **Calendário** — visualização de publicações por data
- **Google Ads sync** — dados do Google Ads no analytics
- **Benchmark** — comparativo com benchmarks do setor
- **Weekly Strategy Review** — revisão semanal automatizada por IA
- **Monthly Report** — relatório mensal exportável em PDF
- **Forum** — comunidade de usuários
- **Multi-workspace** — gerenciar múltiplos clientes

## VideoIA — placeholder

Na sidebar, manter o item de menu "VideoIA" mas com badge "Em breve" e
ao clicar mostrar página simples:

```
Título: "Geração de Vídeo com IA"
Subtítulo: "Em breve"
Texto: "Estamos desenvolvendo a integração com VEO 3.1, Sora 2 e Seedance 1.5.
       Por enquanto, foque na criação de carrosséis e criativos estáticos."
```
