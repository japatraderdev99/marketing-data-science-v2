import { Pencil, Trash2, Megaphone, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign } from '../hooks/useCampaigns';

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  engagement: 'Engajamento',
  conversion: 'Conversão',
  retention: 'Retenção',
};

const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  google: 'Google',
  facebook: 'Facebook',
};

const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: 'bg-blue-500/10 text-blue-400',
  engagement: 'bg-purple-500/10 text-purple-400',
  conversion: 'bg-brand/10 text-brand',
  retention: 'bg-green-500/10 text-green-400',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ended: 'bg-surface-hover text-text-muted border-border',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  ended: 'Encerrada',
};

interface Props {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function CampaignCard({ campaign, onEdit, onDelete, deleting }: Props) {
  const hasDates = campaign.start_date || campaign.end_date;

  return (
    <div className="group bg-surface-elevated border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-brand/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm text-text-primary truncate">{campaign.name}</h3>
            {campaign.channel && (
              <p className="text-xs text-text-muted">{CHANNEL_LABELS[campaign.channel]}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLORS[campaign.status])}>
            {STATUS_LABELS[campaign.status]}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {campaign.objective && (
          <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg', OBJECTIVE_COLORS[campaign.objective])}>
            {OBJECTIVE_LABELS[campaign.objective]}
          </span>
        )}
        {campaign.budget && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-surface-hover text-text-secondary">
            <DollarSign className="w-3 h-3" />
            R$ {campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        )}
        {hasDates && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-surface-hover text-text-secondary">
            <Calendar className="w-3 h-3" />
            {campaign.start_date ? new Date(campaign.start_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
            {' → '}
            {campaign.end_date ? new Date(campaign.end_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '∞'}
          </span>
        )}
      </div>

      {/* Context preview */}
      {campaign.context && (
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{campaign.context}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(campaign)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-border text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <Pencil className="w-3 h-3" /> Editar
        </button>
        <button
          onClick={() => onDelete(campaign.id)}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-red-500/10 text-xs text-text-muted hover:text-red-400 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3 h-3" /> Excluir
        </button>
      </div>
    </div>
  );
}
