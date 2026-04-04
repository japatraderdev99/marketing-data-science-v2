

# Relatório Mensal CMO — Upload + Análise IA + Histórico Estratégico

## Objetivo

Criar na aba Analytics uma caixa de upload para PDFs de relatórios mensais do CMO. O Claude Sonnet 4 (via OpenRouter) analisa o documento e extrai KPIs, insights e recomendações. Os dados ficam persistidos para acompanhamento mês-a-mês.

## Arquitetura

```text
PDF Upload (Analytics.tsx)
    ↓
Supabase Storage (media-library bucket)
    ↓
Edge Function "analyze-monthly-report"
    ├── Converte PDF → imagens (base64) via pdf parsing
    ├── Envia páginas ao Claude Sonnet 4 (OpenRouter) com visão
    ├── Extrai: KPIs, insights, alertas, recomendações
    └── Persiste na tabela "monthly_reports"
    ↓
UI: Cards com histórico de relatórios + comparativo mensal
```

## Mudanças

### 1. Nova tabela `monthly_reports`
- `id`, `user_id`, `report_month` (date), `file_url`, `file_name`
- `extracted_data` (jsonb) — KPIs estruturados, insights, alertas
- `ai_analysis` (text) — análise markdown completa
- `model_used`, `created_at`
- RLS: authenticated can view, users can insert/delete own

### 2. Nova Edge Function `analyze-monthly-report`
- Recebe `fileUrl`, `fileName`, `reportMonth`
- Baixa o PDF, converte páginas em imagens base64
- Envia ao Claude Sonnet 4 via OpenRouter com prompt estruturado para extrair:
  - KPIs numéricos (investimento, leads, CPL, conversões, ROAS, etc.)
  - Top insights estratégicos
  - Alertas/riscos
  - Recomendações para próximo mês
- Retorna análise markdown + JSON estruturado
- Persiste em `monthly_reports`

### 3. Nova aba "Relatórios CMO" no Analytics
- Caixa de upload drag-and-drop para PDF
- Seletor de mês/ano do relatório
- Ao enviar: upload → storage → edge function → análise
- Lista de relatórios anteriores com cards expandíveis
- Cada card mostra: mês, KPIs principais, análise completa
- Comparativo visual mês-a-mês dos KPIs extraídos

### 4. Arquivos modificados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | Criar tabela `monthly_reports` com RLS |
| `supabase/functions/analyze-monthly-report/index.ts` | Nova edge function com Claude Sonnet 4 |
| `src/pages/Analytics.tsx` | Nova aba "Relatórios CMO" com upload + histórico |

