import {
  Target, TrendingUp, BookOpen, BarChart3, Brain, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PlaybookSections from '@/components/estrategia/PlaybookSections';
import KnowledgeBaseSection from '@/components/estrategia/KnowledgeBaseSection';
import BenchmarkSection from '@/components/estrategia/BenchmarkSection';
import MetaFieldsPanel from '@/components/estrategia/MetaFieldsPanel';
import ReferenceFiles from '@/components/estrategia/ReferenceFiles';

/* ── Scorecard KPIs ── */
const SCORECARD = [
  { icon: Target, label: 'Seções Críticas', value: '4/4', color: 'text-emerald-400' },
  { icon: TrendingUp, label: 'Completude Geral', value: '100%', color: 'text-emerald-400' },
  { icon: BookOpen, label: 'Brand Book', value: 'Ativo', color: 'text-emerald-400' },
  { icon: BarChart3, label: 'Benchmarks', value: '2 ref.', color: 'text-text-primary' },
  { icon: Brain, label: 'Meta-Fields IA', value: '95%', color: 'text-emerald-400' },
];

export default function Estrategia() {
  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      {/* Scorecard */}
      <div className="grid grid-cols-5 gap-3">
        {SCORECARD.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="p-3 rounded-xl border border-border bg-surface-elevated text-center">
            <div className="flex items-center justify-between mb-1">
              <Icon className="w-4 h-4 text-text-muted" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className={cn('font-heading font-black text-lg', color)}>{value}</p>
            <p className="text-[10px] text-text-muted">{label}</p>
          </div>
        ))}
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
      <KnowledgeBaseSection />

      {/* Benchmark */}
      <BenchmarkSection />

      {/* Meta-Fields */}
      <MetaFieldsPanel />

      {/* Reference Files */}
      <ReferenceFiles />

      {/* Save Button */}
      <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-white text-sm font-bold hover:bg-brand-dark transition-colors">
        <Save className="w-4 h-4" /> Salvar playbook estratégico
      </button>
      <p className="text-[11px] text-text-muted text-center">
        Os dados são salvos localmente e alimentam a IA em todas as gerações
      </p>
    </div>
  );
}
