# Report: Requisitos para Testes de Criação de Assets e Importação de Mídias

**Data:** 2026-04-04
**Status:** Auditoria completa — bloqueios identificados

---

## 1. Estado Atual das Ferramentas de Criação

| Ferramenta | Geração de Texto | Geração de Imagem | Export | Salva no DB | Status |
|---|---|---|---|---|---|
| DirectCarousel | ✅ via generate-carousel-visual | ❌ não usa generate-slide-image | ✅ ZIP | ❌ | Parcial |
| NarrativeCarousel | ✅ via generate-narrative-carousel | ❌ não usa generate-slide-image | ✅ ZIP | ❌ | Parcial |
| CriativoBatch | ✅ via generate-creative-batch | ❌ mediaUrl sempre null | ✅ ZIP | ❌ | Parcial |
| ArteUnica | ✅ via generate-carousel-visual (1 slide) | ❌ não usa generate-slide-image | ❌ botão quebrado | ❌ | Quebrado |

### Resumo: geração de TEXTO funciona em todas. Geração de IMAGEM por IA não é chamada em nenhuma. Nenhuma salva no banco.

---

## 2. Bloqueios para Teste de Criação de Assets

### Bloqueio 1: Mismatch de colunas creative_drafts (CRÍTICO)
- **DB** (migration 005): colunas `type` e `data`
- **TypeScript** (types/index.ts:198-207): propriedades `draft_type` e `content_json`
- **Status do DB**: `'draft','approved','published','archived'`
- **Status no TS**: `'draft','approved','exported'`
- **Impacto:** Qualquer tentativa de ler/gravar drafts vai falhar com column not found
- **Fix:** Alinhar o TypeScript ao schema do banco (renomear draft_type→type, content_json→data, ajustar enum de status)

### Bloqueio 2: Nenhum hook de persistência de drafts
- Não existe `useCreativeDrafts.ts` ou equivalente
- Criativos gerados ficam apenas em useState — navegar para outra página perde tudo
- **Fix:** Criar hooks useSaveDraft, useMyDrafts, useUpdateDraftStatus

### Bloqueio 3: ArteUnica sem download
- O botão "Baixar" existe no JSX mas sem onClick handler
- **Fix:** Adicionar handler usando html-to-image (já é dependência do projeto)

### Bloqueio 4: Imagens IA nunca geradas
- Edge function `generate-slide-image` existe e funciona (Gemini 3 Pro Image via OpenRouter)
- Nenhum componente frontend a invoca
- CriativoBatch define `mediaUrl` em cada variação mas sempre retorna `null` da edge function
- **Fix:** Após gerar texto, chamar generate-slide-image em paralelo (chunks de 3)

---

## 3. Estado da Importação de Mídias (Media Library)

### Funcional ✅
- Upload de imagens para Supabase Storage (bucket `media`)
- Inserção de registro no banco (tabela `media_library`)
- Chamada à edge function `tag-media` após upload
- Polling de status de tagging (2s interval)
- Filtros por mood, style, busca textual
- Painel de detalhes com tags IA, fit scores
- Delete de mídia

### Pendente ⚠️
- **Integração com pipeline criativo:** Media Library não conecta com as ferramentas de criação. Não há como selecionar uma imagem da biblioteca para usar como background de um criativo.
- **Bulk import:** Não há importação em massa (apenas upload individual)
- **Drag & drop:** Upload é via file picker, sem drag-and-drop
- **fit_score_map:** A edge function tag-media retorna scores por persona, mas o frontend só exibe como badge. Não há lógica de "sugerir melhores imagens para este criativo".

---

## 4. Capacidade do Banco de Dados

### Schema (11 migrações aplicadas)
| # | Tabela | Colunas | RLS | Index |
|---|--------|---------|-----|-------|
| 001 | workspaces, workspace_members | 8, 5 | ✅ | ✅ |
| 002 | meta_ads_performance | 20+ | ✅ | ✅ |
| 003 | ga4_metrics, operational_metrics, google_ads_campaigns | 15+, 10+, 15+ | ✅ | ✅ |
| 004 | campaigns | 12 | ✅ | ✅ |
| 005 | creative_drafts | 10 | ✅ | ✅ |
| 006 | media_library | 20+ | ✅ | ✅ |
| 007 | strategy_knowledge, ai_usage_log | 8, 12 | ✅ | ✅ |
| 008 | carousel_templates | 10 | ✅ | ✅ |
| 009 | format_templates | 12 | ✅ | ✅ |
| 010 | video_scripts | 10 | ✅ | ✅ |
| 011 | brand_assets, brand_colors, brand_fonts | 12, 8, 10 | ✅ | ✅ |

### Storage Buckets
| Bucket | Limite | Tipos Permitidos | Status |
|--------|--------|------------------|--------|
| media | 20MB/arquivo | image/* | ✅ Ativo |
| knowledge | 10MB/arquivo | text/*, application/* | ✅ Ativo |
| brand-assets | 10MB/arquivo | image/*, image/svg+xml | ✅ Ativo |

### Plano Supabase (Free Tier)
- **DB:** 500MB PostgreSQL (amplo para ~100k registros de marketing data)
- **Storage:** 1GB total nos 3 buckets
- **Edge Functions:** 500k invocações/mês, 2MB payload
- **Auth:** 50k MAU
- **Realtime:** 200 conexões simultâneas

### Avaliação de Capacidade
- **Para testes:** ✅ Mais que suficiente. Free tier comporta centenas de uploads, milhares de drafts, e dezenas de milhares de linhas de analytics.
- **Para produção com 1-10 usuários:** ✅ Ainda confortável.
- **Para escalar (50+ usuários ativos):** ⚠️ Storage de 1GB será o primeiro gargalo (imagens consomem rápido). Considerar upgrade para Pro ($25/mês → 8GB storage, 100GB bandwidth).

---

## 5. Plano de Ação — Ordem de Execução

### Fase 1: Desbloqueio (permitir testes básicos)
1. ✏️ Fix creative_drafts type mismatch em `types/index.ts`
2. ✏️ Criar `useCreativeDrafts.ts` com hooks de persistência
3. ✏️ Fix ArteUnica download handler
4. 🧪 **TESTE:** Gerar criativo → salvar draft → recarregar página → draft persiste

### Fase 2: Imagens IA (criação completa de assets)
5. ✏️ Integrar `generate-slide-image` no CriativoBatch
6. ✏️ Integrar `generate-slide-image` nos carousels (opcional, text-first é válido)
7. 🧪 **TESTE:** Gerar batch com imagens IA → cada variação tem imagem real

### Fase 3: Pipeline integrado (Media Library → Criativos)
8. ✏️ Criar seletor de mídia nos componentes de criação
9. ✏️ Passar `background_url` da mídia selecionada para SlidePreview
10. 🧪 **TESTE:** Upload imagem → taggeada por IA → selecionar no criativo → export com imagem

### Fase 4: Sync de dados (requer credenciais)
11. 🔑 Configurar META_ACCESS_TOKEN e demais secrets
12. 🧪 **TESTE:** Disparar sync → dados reais populam analytics

---

## 6. Secrets Necessários (ação do Gabriel)

| Secret | Para | Onde obter |
|--------|------|-----------|
| META_ACCESS_TOKEN | sync-meta-insights, meta-diagnose | Meta Business Suite → Settings → Access Tokens |
| GOOGLE_SERVICE_ACCOUNT_JSON | sync-ga4, sync-google-ads | Google Cloud Console → IAM → Service Accounts |
| GA4_PROPERTY_ID | sync-ga4 | Google Analytics → Admin → Property Settings |
| GOOGLE_ADS_DEVELOPER_TOKEN | sync-google-ads | Google Ads API Center |
| GOOGLE_ADS_CUSTOMER_ID | sync-google-ads | Google Ads → account number (sem hífens) |
| GOOGLE_ADS_MANAGER_ID | sync-google-ads | MCC account number (se aplicável) |

**Já configurados:** OPENROUTER_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
