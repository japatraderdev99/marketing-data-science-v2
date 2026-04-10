import { Target, TrendingUp, BookOpen, BarChart3, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import PlaybookSections from '@/components/estrategia/PlaybookSections';
import KnowledgeBaseSection from '@/components/estrategia/KnowledgeBaseSection';
import BenchmarkSection from '@/components/estrategia/BenchmarkSection';
import MetaFieldsPanel from '@/components/estrategia/MetaFieldsPanel';
import ReferenceFiles from '@/components/estrategia/ReferenceFiles';
import { useStrategyData } from '@/features/estrategia/useStrategyData';

function ScorecardCard({
  icon: Icon, label, value, color, subtext,
}: { icon: typeof Target; label: string; value: string; color: string; subtext?: string }) {
  return (
    <div className="p-3 rounded-xl border border-border bg-surface-elevated text-center">
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-4 h-4 text-text-muted" />
        <span className={cn('w-2 h-2 rounded-full', color === 'text-emerald-400' ? 'bg-emerald-400' : color === 'text-amber-400' ? 'bg-amber-400' : 'bg-text-muted/40')} />
      </div>
      <p className={cn('font-heading font-black text-lg', color)}>{value}</p>
      <p className="text-[10px] text-text-muted">{label}</p>
      {subtext && <p className="text-[9px] text-text-muted/60 mt-0.5">{subtext}</p>}
    </div>
  );
}

export default function Estrategia() {
  const {
    kbDocs, kbLoading, uploading, uploadKbDoc, deleteKbDoc, fillPlaybookFromKb, fillingPlaybook,
    benchmarks, benchmarksLoading, uploadBenchmark, deleteBenchmark,
    metafields, extractingMeta, fillingMeta, extractMetafields, fillMetafieldsFromKb,
    scorecard,
  } = useStrategyData();

  const { criticalFilled, totalCritical, completeness, kbDoneCount, benchmarkCount, metafieldsScore } = scorecard;

  const criticalColor = criticalFilled === totalCritical ? 'text-emerald-400' : criticalFilled > 0 ? 'text-amber-400' : 'text-text-muted';
  const completenessColor = completeness >= 80 ? 'text-emerald-400' : completeness >= 40 ? 'text-amber-400' : 'text-text-muted';
  const kbColor = kbDoneCount > 0 ? 'text-emerald-400' : 'text-text-muted';
  const benchColor = benchmarkCount > 0 ? 'text-text-primary' : 'text-text-muted';
  const metaColor = metafieldsScore >= 80 ? 'text-emerald-400' : metafieldsScore >= 50 ? 'text-amber-400' : 'text-text-muted';

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      {/* Scorecard */}
      <div className="grid grid-cols-5 gap-3">
        <ScorecardCard
          icon={Target} label="Seções Críticas"
          value={`${criticalFilled}/${totalCritical}`}
          color={criticalColor}
          subtext={criticalFilled === totalCritical ? 'Completo' : 'Incompleto'}
        />
        <ScorecardCard
          icon={TrendingUp} label="Completude Geral"
          value={`${completeness}%`}
          color={completenessColor}
        />
        <ScorecardCard
          icon={BookOpen} label="Knowledge Base"
          value={kbDoneCount > 0 ? `${kbDoneCount} doc${kbDoneCount > 1 ? 's' : ''}` : 'Vazio'}
          color={kbColor}
          subtext={kbDoneCount > 0 ? 'Analisado' : 'Envie docs'}
        />
        <ScorecardCard
          icon={BarChart3} label="Benchmarks"
          value={benchmarkCount > 0 ? `${benchmarkCount} ref.` : '0 ref.'}
          color={benchColor}
        />
        <ScorecardCard
          icon={Brain} label="Meta-Fields IA"
          value={metafieldsScore > 0 ? `${metafieldsScore}%` : '—'}
          color={metaColor}
          subtext={metafieldsScore > 0 ? 'Extraídos' : 'Não extraído'}
        />
      </div>

      {/* Playbook Header */}
      <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
            <Target className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Playbook Estratégico</p>
            <p className="text-[11px] text-text-muted">
              Este documento norteia <strong>todas</strong> as criações e comunicações da marca. Quanto mais preciso, mais assertivo é o conteúdo gerado pela IA.
            </p>
          </div>
        </div>
        <PlaybookSections />
      </div>

      {/* Knowledge Base */}
      <KnowledgeBaseSection
        docs={kbDocs}
        loading={kbLoading}
        uploading={uploading}
        onUpload={uploadKbDoc}
        onDelete={deleteKbDoc}
        onFillPlaybook={fillPlaybookFromKb}
        fillingPlaybook={fillingPlaybook}
      />

      {/* Benchmark */}
      <BenchmarkSection
        benchmarks={benchmarks}
        loading={benchmarksLoading}
        uploading={uploading}
        onUpload={uploadBenchmark}
        onDelete={deleteBenchmark}
      />

      {/* Meta-Fields */}
      <div className="rounded-xl border border-border bg-surface-elevated p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-lg bg-brand/15 p-1.5 border border-brand/20">
            <Brain className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Meta-Fields Estratégicos</p>
            <p className="text-[11px] text-text-muted">
              Campos estruturados extraídos pela IA que alimentam automaticamente criativos, carrosséis e campanhas
            </p>
          </div>
        </div>
        <MetaFieldsPanel
          metafields={metafields}
          extracting={extractingMeta}
          filling={fillingMeta}
          onExtract={extractMetafields}
          onFillFromKb={fillMetafieldsFromKb}
          kbDoneCount={kbDoneCount}
        />
      </div>

      {/* Reference Files */}
      <ReferenceFiles
        docs={kbDocs}
        uploading={uploading}
        onUpload={(file) => uploadKbDoc(file, 'reference')}
        onDelete={deleteKbDoc}
      />
    </div>
  );
}
