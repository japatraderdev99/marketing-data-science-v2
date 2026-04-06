import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign, CampaignInput, CampaignObjective, CampaignChannel, CampaignStatus } from '../hooks/useCampaigns';

const OBJECTIVES: { value: CampaignObjective; label: string }[] = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'conversion', label: 'Conversão' },
  { value: 'retention', label: 'Retenção' },
];

const CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
];

const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'ended', label: 'Encerrada' },
];

const EMPTY: CampaignInput = {
  name: '',
  objective: '',
  channel: '',
  budget: '',
  start_date: '',
  end_date: '',
  context: '',
  status: 'active',
};

interface Props {
  editing: Campaign | null;
  onClose: () => void;
  onSubmit: (input: CampaignInput) => Promise<void>;
  isPending: boolean;
}

export function CampaignForm({ editing, onClose, onSubmit, isPending }: Props) {
  const [form, setForm] = useState<CampaignInput>(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        objective: editing.objective ?? '',
        channel: (editing.channel as CampaignChannel) ?? '',
        budget: editing.budget?.toString() ?? '',
        start_date: editing.start_date ?? '',
        end_date: editing.end_date ?? '',
        context: editing.context ?? '',
        status: editing.status,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  const set = (field: keyof CampaignInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit(form);
  };

  const inputCls = 'w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none transition-colors';
  const labelCls = 'block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-elevated border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-black text-base text-text-primary uppercase tracking-wider">
            {editing ? 'Editar Campanha' : 'Nova Campanha'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className={labelCls}>Nome *</label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Ex: Campanha de Conversão — Junho"
              className={inputCls}
              required
            />
          </div>

          {/* Objetivo + Canal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Objetivo</label>
              <select value={form.objective} onChange={set('objective')} className={inputCls}>
                <option value="">Selecionar</option>
                {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Canal Principal</label>
              <select value={form.channel} onChange={set('channel')} className={inputCls}>
                <option value="">Selecionar</option>
                {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Budget + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Budget Mensal (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={set('budget')}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data de Início</label>
              <input type="date" value={form.start_date} onChange={set('start_date')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data de Fim</label>
              <input type="date" value={form.end_date} onChange={set('end_date')} className={inputCls} />
            </div>
          </div>

          {/* Briefing */}
          <div>
            <label className={labelCls}>Briefing / Contexto</label>
            <textarea
              value={form.context}
              onChange={set('context')}
              rows={4}
              placeholder="Descreva o contexto, público-alvo e mensagem principal desta campanha. Este texto será injetado nos prompts de IA."
              className={cn(inputCls, 'resize-none')}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || isPending}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-colors',
                !form.name.trim() ? 'bg-text-muted cursor-not-allowed' : 'gradient-brand'
              )}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Salvar Alterações' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
