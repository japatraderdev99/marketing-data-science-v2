import { useRef, useState } from 'react';
import { Search, Lightbulb, Trash2, Loader2, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Benchmark } from '@/features/estrategia/useStrategyData';

const PLATFORMS = ['Facebook Ads', 'Instagram Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'YouTube'];
const FORMATS = ['imagem', 'carrossel', 'vídeo', 'stories', 'reels'];

const STATUS_MAP = {
  pending:    { label: 'Na fila',   color: 'text-text-muted bg-surface-hover',   icon: Clock },
  processing: { label: 'Analisando',color: 'text-amber-400 bg-amber-400/10',     icon: Loader2 },
  done:       { label: 'Insights',  color: 'text-amber-400 bg-amber-400/10',     icon: Lightbulb },
  error:      { label: 'Erro',      color: 'text-red-400 bg-red-400/10',         icon: AlertCircle },
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function InsightsPanel({ insights }: { insights: Record<string, unknown> }) {
  const ca = insights.competitorAnalysis as Record<string, unknown> | undefined;
  const items = (insights.adaptationInsights as string[] | undefined) ?? [];
  const actions = (insights.actionItems as string[] | undefined) ?? [];
  const score = insights.overallScore as number | undefined;
  const threat = insights.threatLevel as string | undefined;

  return (
    <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {score !== undefined && (
          <span className="text-[11px] font-bold text-amber-400">Score: {score}/100</span>
        )}
        {threat && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
            threat === 'high' ? 'bg-red-400/20 text-red-400' :
            threat === 'medium' ? 'bg-amber-400/20 text-amber-400' :
            'bg-emerald-400/20 text-emerald-400'
          )}>
            Ameaça: {threat}
          </span>
        )}
      </div>
      {ca && (
        <div className="space-y-1">
          {ca.overallStrategy ? <p className="text-[11px] text-text-primary/80"><strong>Estratégia:</strong> {String(ca.overallStrategy)}</p> : null}
          {ca.keyMessage ? <p className="text-[11px] text-text-primary/80"><strong>Mensagem-chave:</strong> {String(ca.keyMessage)}</p> : null}
          {Array.isArray(ca.weaknesses) && ca.weaknesses.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider mb-1">Fraquezas</p>
              {ca.weaknesses.map((w, i) => (
                <p key={i} className="text-[11px] text-text-muted pl-2 border-l border-red-400/30">{String(w)}</p>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {items.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold text-brand/70 uppercase tracking-wider mb-1">Como adaptar para nossa marca</p>
          {items.map((item, i) => (
            <p key={i} className="text-[11px] text-text-primary/80 pl-2 border-l border-brand/30 mb-1">{item}</p>
          ))}
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1">Ações imediatas</p>
          {actions.map((a, i) => (
            <p key={i} className="text-[11px] text-text-primary/80 pl-2 border-l border-emerald-400/30 mb-1">→ {a}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  benchmarks: Benchmark[];
  loading: boolean;
  uploading: boolean;
  onUpload: (file: File, name: string, platform: string, format: string) => Promise<void>;
  onDelete: (id: string, storagePath: string | null) => Promise<void>;
}

export default function BenchmarkSection({ benchmarks, loading, uploading, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [competitorName, setCompetitorName] = useState('');
  const [platform, setPlatform] = useState('');
  const [format, setFormat] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !competitorName.trim()) return;
    for (const file of Array.from(files)) {
      await onUpload(file, competitorName.trim(), platform, format);
    }
    setCompetitorName('');
    setPlatform('');
    setFormat('');
  };

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-yellow-400/10 p-1.5 border border-yellow-400/20">
          <Search className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">Benchmark de Concorrentes</span>
            {loading ? (
              <Loader2 className="w-3 h-3 text-text-muted animate-spin" />
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/15 text-yellow-400">
                {benchmarks.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted">Envie materiais de concorrentes — a IA analisa e gera insights adaptados à sua marca</p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="rounded-lg border border-border bg-surface-hover p-4 space-y-3">
        <input
          type="text"
          placeholder="Nome do concorrente *"
          value={competitorName}
          onChange={e => setCompetitorName(e.target.value)}
          className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-brand/50"
        />
        <div className="grid grid-cols-2 gap-3">
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-muted">
            <option value="">Plataforma (opcional)</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={format} onChange={e => setFormat(e.target.value)} className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-muted">
            <option value="">Formato (opcional)</option>
            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-3 text-center transition-colors',
            competitorName.trim() ? 'border-brand/40 cursor-pointer hover:border-brand/70' : 'border-border opacity-50 cursor-not-allowed'
          )}
          onClick={() => competitorName.trim() && inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-brand">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs font-semibold">Enviando e analisando...</span>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              <Search className="w-3.5 h-3.5 inline mr-1" />
              <span className={cn('font-bold', competitorName.trim() ? 'text-text-secondary' : 'text-text-muted')}>
                {competitorName.trim() ? 'Upload do material' : 'Preencha o nome do concorrente primeiro'}
              </span>
              {competitorName.trim() && ' · Print, anúncio, carrossel · máx 20MB'}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
            onChange={e => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Benchmark List */}
      {benchmarks.length > 0 && (
        <div className="space-y-2">
          {benchmarks.map(b => {
            const s = STATUS_MAP[b.status] ?? STATUS_MAP.error;
            const StatusIcon = s.icon;
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} className="rounded-lg border border-border bg-surface overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 text-xs font-bold text-yellow-400">
                    {b.competitor_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{b.competitor_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.platform && <span className="text-[10px] text-text-muted">{b.platform}</span>}
                      {b.format_type && <span className="text-[10px] text-text-muted">{b.format_type}</span>}
                      {b.file_size && <span className="text-[10px] text-text-muted">{formatBytes(b.file_size)}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => b.status === 'done' && setExpanded(isOpen ? null : b.id)}
                    className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0', s.color, b.status === 'done' && 'cursor-pointer hover:opacity-80')}
                  >
                    <StatusIcon className={cn('w-3 h-3', b.status === 'processing' && 'animate-spin')} />
                    {s.label}
                    {b.status === 'done' && (isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                  <button onClick={() => onDelete(b.id, b.file_url)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isOpen && b.ai_insights && (
                  <div className="px-3 pb-3">
                    <InsightsPanel insights={b.ai_insights} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-text-muted text-center">
        A IA analisa o material e gera insights de como adaptar os ângulos para a sua comunicação
      </p>
    </div>
  );
}
