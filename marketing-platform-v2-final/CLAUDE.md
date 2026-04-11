# Marketing AI Platform — Instruções para o Agente

Bem-vindo ao projeto. Leia este arquivo ANTES de qualquer ação.

## O que você está construindo

Uma plataforma de marketing alimentada por IA para empreendedores e pequenas agências
que não têm equipe de design ou marketing. O objetivo é:

1. Conectar dados de campanhas (Meta Ads, GA4, Google Ads) e transformá-los em insights acionáveis
2. Usar múltiplos modelos de IA orquestrados por tipo de task para gerar criativos estáticos
   (carrosséis, posts) em lote a partir de inputs simples
3. Manter uma biblioteca de mídia com tagging automático por IA para reusar imagens
   sem precisar gerar via IA em excesso
4. Aplicar criativos em templates editáveis em massa

## Leia os docs nesta ordem

1. `docs/RULES.md` — regras absolutas de código (leia e não desvie)
2. `docs/ARCHITECTURE.md` — stack, estrutura de pastas, padrões
3. `docs/DATABASE.md` — schema completo do Supabase
4. `docs/AI_SYSTEM.md` — orquestração de IA, task routing, edge functions
5. `docs/FEATURES.md` — todas as features a implementar com prioridade
6. `docs/MEDIA_LIBRARY.md` — feature de biblioteca com tagging inteligente
7. `docs/IMPLEMENTATION_PLAN.md` — plano passo a passo
8. `docs/REFERENCES.md` — o que aproveitar dos projetos existentes

## Projetos de referência (leia antes de implementar cada feature)

```
/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW
/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-data-science-main
/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main
```

## Regra mais importante

Nenhum arquivo pode ultrapassar 400 linhas.
Se chegar nesse limite, pare e divida antes de continuar.

## Contexto de negócio (DNA da marca)

Plataforma voltada para profissionais liberais autônomos brasileiros da economia flexível.

- Cor primária: `#E8603C` (coral laranja)
- Tipografia: Montserrat 900, UPPERCASE
- Filosofia visual: "silêncio e verdade" — documentário + color grading publicitário
- Slogan obrigatório no CTA: "pronto. resolvido."
- Imagens: estilo documentário, sem fotos de stock corporativo
- Personagem: profissional liberal autônomo brasileiro, 25-50 anos, qualquer área — consultor, designer, advogado, coach, nutricionista, contador, fotógrafo, arquiteto, terapeuta, entre muitos outros. NÃO apenas trabalhos braçais (eletricista, mecânico, diarista). Sem estereótipos de raça, classe ou pobreza. Ambiente real de trabalho condizente com a profissão.
- Arco emocional: ANTES (problema) → DURANTE (expertise) → DEPOIS ("pronto. resolvido.")
