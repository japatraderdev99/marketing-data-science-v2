# Referências — O que Aproveitar de Cada Projeto

Antes de implementar qualquer feature, leia os arquivos de referência indicados.
Não copie cegamente — adapte para a nova arquitetura (feature-based, arquivos < 400 linhas).

## Caminhos base dos projetos

```
NEW  = /Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW
MAIN = /Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-data-science-main
OLD  = /Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main
```

---

## Edge Functions — aproveitar do NEW

| Função | Arquivo de referência | O que adaptar |
|---|---|---|
| `ai-router` | `NEW/supabase/functions/ai-router/index.ts` | Adicionar task_type `tag_image`; conectar ao novo schema |
| `generate-carousel-visual` | `NEW/supabase/functions/generate-carousel-visual/index.ts` | Manter lógica integralmente; adaptar queries para novo schema |
| `generate-narrative-carousel` | `NEW/supabase/functions/generate-narrative-carousel/index.ts` | Manter lógica integralmente |
| `analyze-creative-input` | `NEW/supabase/functions/analyze-creative-input/index.ts` | Manter lógica integralmente |
| `sync-meta-insights` | `NEW/supabase/functions/sync-meta-insights/index.ts` | Adaptar para novo schema + calcular creative_score ao salvar |
| `sync-ga4` | `NEW/supabase/functions/sync-ga4/index.ts` | Adaptar para novo schema |
| `suggest-media` | `NEW/supabase/functions/suggest-media/index.ts` | Usar como referência para o novo sistema de matching por fit_score |
| `categorize-media` | `NEW/supabase/functions/categorize-media/index.ts` | Usar como referência para o tag-media (adicionar fit_score_map) |

**Criar do zero (não existe em nenhum projeto):**
- `tag-media` — ver especificação em `docs/MEDIA_LIBRARY.md` e `docs/AI_SYSTEM.md`
- `generate-creative-batch` — extrair lógica do `NEW/src/pages/Criativo.tsx`

---

## Componentes de Carrossel — aproveitar do MAIN

O projeto MAIN tem a melhor suite de componentes de carrossel (16 componentes modulares).
O NEW tem a mesma funcionalidade mas em arquivos monolíticos de 4000+ linhas.

| Componente | Arquivo de referência | Notas |
|---|---|---|
| `SlideCard` | `MAIN/src/components/carousel/SlideCard.tsx` | Edição por slide, direto mode |
| `SlidePreview` | `MAIN/src/components/carousel/SlidePreview.tsx` | Render com tema, opacidade, posição |
| `NarrativeSlideCard` | `MAIN/src/components/carousel/NarrativeSlideCard.tsx` | Edição slide narrativa |
| `NarrativeSlidePreview` | `MAIN/src/components/carousel/NarrativeSlidePreview.tsx` | Render editorial |
| `DraftsPanel` | `MAIN/src/components/carousel/DraftsPanel.tsx` | Salvar/carregar drafts |
| `BatchExportButton` | `MAIN/src/components/carousel/BatchExport.tsx` | Export ZIP de slides |
| `AngleSelector` | `MAIN/src/components/carousel/AngleRecommendation.tsx` | Sugestão de angle |
| `ThemeSelector` | Inline no `MAIN/src/pages/AiCarrosseis.tsx` | Extrair como componente |
| `constants.ts` | `MAIN/src/components/carousel/constants.ts` | Angles, temas, formatos, tons |
| `types.ts` | `MAIN/src/components/carousel/types.ts` | Interfaces TypeScript |
| `exportCarouselHTML.ts` | `MAIN/src/components/carousel/exportCarouselHTML.ts` | Export HTML |

**Não usar:**
- `MAIN/src/pages/AiCarrosseis.tsx` (1.610 linhas) — a page em si é monolítica demais
- `NEW/src/pages/AiCarrosseis.tsx` (4.208 linhas) — ainda pior

**Como usar:** ler os componentes do MAIN para entender a lógica,
reescrever respeitando o limite de 400 linhas.

---

## Lógica de Analytics — aproveitar do NEW

| Lógica | Arquivo de referência | O que extrair |
|---|---|---|
| Score criativo (fórmula) | `NEW/src/pages/Analytics.tsx` linhas 1-100 | Algoritmo CTR*30% + CPC*20% + conv*30% + eff*20% |
| Interface MetaAd | `NEW/src/pages/Analytics.tsx` | Tipos de dados dos anúncios |
| Agregação de anúncios | `NEW/src/pages/Analytics.tsx` | Função `aggregateAds()` |
| Labels dos scores | `NEW/src/pages/Analytics.tsx` | Excelente/Bom/Regular/Fraco |

---

## Lógica de Criativo Batch — aproveitar do NEW

O `NEW/src/pages/Criativo.tsx` (2.425 linhas) tem toda a lógica de geração em lote.
Extrair para a edge function `generate-creative-batch` e para hooks:

| Lógica | Onde está | O que extrair |
|---|---|---|
| Visual Styles | `NEW/src/pages/Criativo.tsx` linhas 1-50 | Array VISUAL_STYLES com 6 presets |
| Angles | `NEW/src/pages/Criativo.tsx` | Array ANGLES com ícones, cores, descrições |
| Nichos | `NEW/src/pages/Criativo.tsx` | Array de nichos de prestadores |
| Batch generation loop | `NEW/src/pages/Criativo.tsx` | Promise.allSettled em chunks de 3 |
| CreativeVariation type | `NEW/src/pages/Criativo.tsx` | Interface completa |

---

## Schema do Banco — aproveitar do NEW

O NEW tem 20 migration files em:
`NEW/supabase/migrations/`

Leia-as para entender o histórico do schema, mas **não use diretamente**.
O novo schema está definido em `docs/DATABASE.md` e é mais limpo.

A tabela `media_library` do NEW não tem `ai_fit_score_map` — o novo schema adiciona isso.

---

## O que NÃO aproveitar

| Arquivo | Razão |
|---|---|
| `NEW/src/pages/AiCarrosseis.tsx` | 4.208 linhas — monolítico demais |
| `NEW/src/pages/Criativo.tsx` | 2.425 linhas — extrair apenas a lógica |
| `NEW/src/pages/Campanhas.tsx` | 2.028 linhas — reescrever simples |
| `MAIN/src/data/seedData.ts` | Usa localStorage/migration manual |
| Qualquer hook com localStorage para dados persistentes | Migrar tudo para Supabase |
| `MAIN/functions/` | Cloud Functions Firebase — não usar (mudamos para Supabase) |

---

## Padrão de análise antes de implementar

Antes de implementar cada feature, siga este processo:

1. Leia o arquivo de referência indicado neste documento
2. Identifique a lógica core (o que a feature faz)
3. Separe a lógica de UI da lógica de dados
4. Crie o hook primeiro (dados/lógica)
5. Crie os componentes depois (UI pura)
6. Crie a page por último (shell que compõe os componentes)
7. Verifique que nenhum arquivo ultrapassou 400 linhas

Se um componente tem mais de 400 linhas, é porque está fazendo coisas demais.
Divida em sub-componentes menores.
