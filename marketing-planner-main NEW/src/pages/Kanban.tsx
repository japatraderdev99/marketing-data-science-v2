import { useState, useMemo, useEffect } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Campaign, KanbanStatus, Channel, Priority, ContentObjective } from '@/data/seedData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCorners
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, GripVertical, X, Edit2, Trash2, MessageSquare, Calendar,
  AlertCircle, CheckSquare, Square, Clock, Send, ChevronRight,
  Target, Flame, BarChart2, Filter, Users, ExternalLink, Link2, FolderOpen,
  Palette, Video, CheckCircle2, XCircle, ArrowRight, CheckCheck, Move,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Team ─────────────────────────────────────────────────────────────────────

const TEAM = [
  {
    id: 'gabriel',
    name: 'Gabriel',
    role: 'CMO · Head de Comunicação',
    initials: 'GA',
    color: 'bg-blue-500',
    ring: 'ring-blue-500',
    text: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
  },
  {
    id: 'guilherme',
    name: 'Guilherme',
    role: 'Diretor Criativo',
    initials: 'GU',
    color: 'bg-primary',
    ring: 'ring-primary',
    text: 'text-primary',
    bg: 'bg-primary/15',
    border: 'border-primary/30',
  },
  {
    id: 'marcelo',
    name: 'Marcelo',
    role: 'CFO',
    initials: 'MC',
    color: 'bg-emerald-600',
    ring: 'ring-emerald-600',
    text: 'text-emerald-400',
    bg: 'bg-emerald-600/15',
    border: 'border-emerald-600/30',
  },
  {
    id: 'leandro',
    name: 'Leandro',
    role: 'CEO',
    initials: 'LE',
    color: 'bg-violet-600',
    ring: 'ring-violet-600',
    text: 'text-violet-400',
    bg: 'bg-violet-600/15',
    border: 'border-violet-600/30',
  },
  {
    id: 'gustavo',
    name: 'Gustavo',
    role: 'Dev',
    initials: 'GV',
    color: 'bg-rose-600',
    ring: 'ring-rose-600',
    text: 'text-rose-400',
    bg: 'bg-rose-600/15',
    border: 'border-rose-600/30',
  },
] as const;

type TeamMemberId = typeof TEAM[number]['id'];

function getTeamMember(responsible: string) {
  const lower = responsible.toLowerCase();
  if (lower.includes('gabriel')) return TEAM[0];
  if (lower.includes('guilherme')) return TEAM[1];
  if (lower.includes('marcelo')) return TEAM[2];
  if (lower.includes('leandro')) return TEAM[3];
  if (lower.includes('gustavo')) return TEAM[4];
  return null;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS: { id: KanbanStatus; label: string; accent: string; dot: string }[] = [
  { id: 'ideia',         label: 'Ideias',           accent: 'border-t-muted-foreground/40', dot: 'bg-muted-foreground' },
  { id: 'desenvolvimento', label: 'Em Produção',    accent: 'border-t-blue-500',            dot: 'bg-blue-500' },
  { id: 'revisao',       label: 'Revisão',           accent: 'border-t-amber-500',           dot: 'bg-amber-500' },
  { id: 'aprovado',      label: 'Aprovado',          accent: 'border-t-teal',                dot: 'bg-teal' },
  { id: 'publicado',     label: 'Publicado ✓',       accent: 'border-t-green-500',           dot: 'bg-green-500' },
];

const PRIORITY_STYLE: Record<Priority, { badge: string; icon: string }> = {
  Alta:  { badge: 'bg-red-500/15 text-red-400 border-red-500/25',     icon: '🔴' },
  Média: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25', icon: '🟡' },
  Baixa: { badge: 'bg-muted/50 text-muted-foreground border-border',   icon: '🟢' },
};

const CHANNEL_ICON: Record<string, string> = {
  TikTok: '🎵', 'Meta Ads': '📊',
  LinkedIn: '💼', 'Google Ads': '🔍', Orgânico: '🌱', YouTube: '▶️',
};

// ─── Deadline helpers ─────────────────────────────────────────────────────────

function getDaysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function DeadlineBadge({ dateStr }: { dateStr?: string }) {
  const days = getDaysLeft(dateStr);
  if (days === null) return null;
  const overdue = days < 0;
  const urgent = days >= 0 && days <= 3;
  return (
    <div className={cn(
      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
      overdue ? 'bg-red-500/20 text-red-400' :
      urgent  ? 'bg-amber-500/20 text-amber-400' :
                'bg-muted/50 text-muted-foreground'
    )}>
      {overdue ? <AlertCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
      {overdue ? `${Math.abs(days)}d atrasado` : days === 0 ? 'Hoje' : `${days}d`}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function TeamAvatar({ responsible, size = 'sm' }: { responsible: string; size?: 'sm' | 'md' }) {
  const member = getTeamMember(responsible);
  const sz = size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[11px]';
  if (member) {
    return (
      <div className={cn('flex items-center justify-center rounded-full font-bold text-white ring-1 ring-offset-1 ring-offset-card shrink-0', sz, member.color, member.ring)}>
        {member.initials}
      </div>
    );
  }
  const initials = responsible.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  return (
    <div className={cn('flex items-center justify-center rounded-full bg-muted text-muted-foreground font-bold shrink-0', sz)}>
      {initials}
    </div>
  );
}

// ─── Comment type ─────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

// We store comments in the history array with a "💬" prefix to distinguish them
function parseComment(h: { date: string; action: string; user: string }): Comment | null {
  if (!h.action.startsWith('💬')) return null;
  return { id: h.date, author: h.user, text: h.action.slice(2).trim(), date: h.date };
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  campaign, isDragging, onClick, onDelete, selected, onToggleSelect,
}: {
  campaign: Campaign;
  isDragging?: boolean;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({ id: campaign.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSorting ? 0.4 : 1 };
  const member = getTeamMember(campaign.responsible);
  const daysLeft = getDaysLeft(campaign.endDate);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const commentCount = campaign.history.filter(h => h.action.startsWith('💬')).length;
  const doneSubtasks = campaign.subtasks.filter(s => s.done).length;
  const totalSubtasks = campaign.subtasks.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border border-border bg-card p-3 shadow-sm cursor-pointer',
        'transition-all duration-150 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
        isDragging && 'shadow-xl border-primary/50 rotate-1 scale-105',
        isOverdue && 'border-red-500/30',
        isUrgent && !isOverdue && 'border-amber-500/25',
      )}
    >
      {/* Grip + title row */}
      <div className="flex items-start gap-2">
        {onToggleSelect && (
          <button
            onClick={e => { e.stopPropagation(); onToggleSelect(campaign.id); }}
            className={cn('mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-all',
              selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary/50'
            )}
          >
            {selected && <CheckCheck className="h-2.5 w-2.5" />}
          </button>
        )}
        <button
          {...attributes} {...listeners}
          onClick={e => e.stopPropagation()}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2">{campaign.name}</p>

          {/* Channels */}
          {campaign.channel.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {campaign.channel.slice(0, 2).map(ch => (
                <span key={ch} className="text-[10px] text-muted-foreground/70">{CHANNEL_ICON[ch]} {ch}</span>
              ))}
              {campaign.channel.length > 2 && <span className="text-[10px] text-muted-foreground/50">+{campaign.channel.length - 2}</span>}
            </div>
          )}

          {/* Badges */}
          <div className="mt-2 flex flex-wrap gap-1">
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold', PRIORITY_STYLE[campaign.priority].badge)}>
              {PRIORITY_STYLE[campaign.priority].icon} {campaign.priority}
            </span>
            <DeadlineBadge dateStr={campaign.endDate} />
          </div>

          {/* Footer: avatar + meta */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <TeamAvatar responsible={campaign.responsible} size="sm" />
              <span className={cn('text-[9px] font-semibold', member ? member.text : 'text-muted-foreground')}>
                {campaign.responsible.split(' ')[0]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/50">
              {totalSubtasks > 0 && (
                <span className="flex items-center gap-0.5 text-[9px]">
                  <CheckSquare className="h-2.5 w-2.5" /> {doneSubtasks}/{totalSubtasks}
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-0.5 text-[9px]">
                  <MessageSquare className="h-2.5 w-2.5" /> {commentCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete on hover */}
        <button
          onClick={e => { e.stopPropagation(); onDelete?.(campaign.id); }}
          className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Workflow Actions (quick mention) ─────────────────────────────────────────

const WORKFLOW_ACTIONS = [
  { id: 'analisar-copy',   label: 'Analisar copy',         emoji: '📝', suggest: 'gabriel' },
  { id: 'aprovar-arte',    label: 'Aprovar arte',           emoji: '🎨', suggest: 'gabriel' },
  { id: 'revisar-roteiro', label: 'Revisar roteiro',        emoji: '📋', suggest: 'guilherme' },
  { id: 'validar-orcamento', label: 'Validar orçamento',    emoji: '💰', suggest: 'marcelo' },
  { id: 'aprovar-final',   label: 'Aprovação final',        emoji: '✅', suggest: 'leandro' },
  { id: 'implementar',     label: 'Implementar',            emoji: '⚙️', suggest: 'gustavo' },
  { id: 'revisar-criativos', label: 'Revisar criativos',    emoji: '👁️', suggest: 'guilherme' },
  { id: 'dar-feedback',    label: 'Dar feedback',           emoji: '💬', suggest: 'gabriel' },
] as const;

function QuickMentionSection({
  campaign,
  onMention,
}: {
  campaign: Campaign;
  onMention: (memberName: string, action: string) => void;
}) {
  const [selectedMember, setSelectedMember] = useState<TeamMemberId | null>(null);
  const [customAction, setCustomAction] = useState('');

  // Mentions already made (parsed from history)
  const mentions = campaign.history.filter(h => h.action.startsWith('📌 @'));

  const handleQuickAction = (action: typeof WORKFLOW_ACTIONS[number]) => {
    const member = selectedMember
      ? TEAM.find(t => t.id === selectedMember)!
      : TEAM.find(t => t.id === action.suggest)!;
    onMention(member.name, action.label);
    setSelectedMember(null);
  };

  const handleCustom = () => {
    if (!customAction.trim() || !selectedMember) return;
    const member = TEAM.find(t => t.id === selectedMember)!;
    onMention(member.name, customAction.trim());
    setCustomAction('');
    setSelectedMember(null);
  };

  return (
    <div className="p-4 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3 flex items-center gap-1.5">
        <Target className="h-3 w-3" /> Mencionar para ação
      </p>

      {/* Team member selector */}
      <div className="flex gap-1.5 mb-3">
        {TEAM.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedMember(selectedMember === t.id ? null : t.id)}
            className={cn(
              'flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all',
              selectedMember === t.id
                ? `${t.bg} ${t.border} ${t.text} ring-1 ${t.ring}`
                : 'border-border text-muted-foreground hover:border-primary/30'
            )}
          >
            <div className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black text-white', t.color)}>{t.initials}</div>
            {t.name}
          </button>
        ))}
      </div>

      {/* Quick action pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {WORKFLOW_ACTIONS.map(action => {
          const suggestedMember = TEAM.find(t => t.id === action.suggest)!;
          const targetMember = selectedMember ? TEAM.find(t => t.id === selectedMember)! : suggestedMember;
          return (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="group flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all"
            >
              <span>{action.emoji}</span>
              <span>{action.label}</span>
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-black', targetMember.bg, targetMember.text)}>
                @{targetMember.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom action input */}
      {selectedMember && (
        <div className="flex gap-1.5 mb-3">
          <Input
            placeholder={`Ação para @${TEAM.find(t => t.id === selectedMember)?.name}...`}
            value={customAction}
            onChange={e => setCustomAction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustom()}
            className="h-7 text-xs bg-muted/20 border-border/60 flex-1"
          />
          <Button size="sm" variant="ghost" onClick={handleCustom} className="h-7 px-2 text-xs">
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Active mentions */}
      {mentions.length > 0 && (
        <div className="space-y-1.5">
          {mentions.slice(-4).map((m, i) => {
            const nameMatch = m.action.match(/@(\w+)/);
            const mentionedMember = nameMatch ? getTeamMember(nameMatch[1]) : null;
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5">
                {mentionedMember && (
                  <div className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-black text-white', mentionedMember.color)}>
                    {mentionedMember.initials}
                  </div>
                )}
                <span className="text-[10px] text-foreground/70 flex-1">{m.action.replace('📌 ', '')}</span>
                <span className="text-[9px] text-muted-foreground/40">
                  {new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({
  campaign,
  onClose,
  onSave,
  onConvertSubtask,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSave: (c: Campaign) => void;
  onConvertSubtask?: (subtask: { title: string }, campaign: Campaign) => void;
}) {
  const [localCampaign, setLocalCampaign] = useState<Campaign>(campaign);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState<TeamMemberId>('gabriel');
  const [editingSubtask, setEditingSubtask] = useState('');
  const [driveLink, setDriveLink] = useState(campaign.links?.find(l => l.label === 'drive')?.url || '');
  const [editingDrive, setEditingDrive] = useState(false);

  const member = getTeamMember(localCampaign.responsible);
  const comments = localCampaign.history.filter(h => h.action.startsWith('💬'));
  const activity = localCampaign.history.filter(h => !h.action.startsWith('💬'));
  const doneSubtasks = localCampaign.subtasks.filter(s => s.done).length;

  const addComment = () => {
    if (!commentText.trim()) return;
    const entry = { date: new Date().toISOString(), action: `💬 ${commentText.trim()}`, user: TEAM.find(t => t.id === commentAuthor)?.name || commentAuthor };
    const updated = { ...localCampaign, history: [...localCampaign.history, entry] };
    setLocalCampaign(updated);
    onSave(updated);
    setCommentText('');
  };

  const toggleSubtask = (id: string) => {
    const updated = {
      ...localCampaign,
      subtasks: localCampaign.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s),
    };
    setLocalCampaign(updated);
    onSave(updated);
  };

  const addSubtask = () => {
    if (!editingSubtask.trim()) return;
    const updated = {
      ...localCampaign,
      subtasks: [...localCampaign.subtasks, { id: `st-${Date.now()}`, title: editingSubtask.trim(), done: false }],
    };
    setLocalCampaign(updated);
    onSave(updated);
    setEditingSubtask('');
  };

  const moveToColumn = (col: KanbanStatus) => {
    const entry = { date: new Date().toISOString(), action: `Movido para "${COLUMNS.find(c => c.id === col)?.label}"`, user: 'Sistema' };
    const updated = { ...localCampaign, kanbanStatus: col, history: [...localCampaign.history, entry] };
    setLocalCampaign(updated);
    onSave(updated);
  };

  const saveDriveLink = (url: string) => {
    const otherLinks = (localCampaign.links || []).filter(l => l.label !== 'drive');
    const newLinks = url.trim() ? [...otherLinks, { label: 'drive', url: url.trim() }] : otherLinks;
    const updated = { ...localCampaign, links: newLinks };
    setLocalCampaign(updated);
    onSave(updated);
    setEditingDrive(false);
  };

  const assignTo = (name: string) => {
    const updated = { ...localCampaign, responsible: name };
    setLocalCampaign(updated);
    onSave(updated);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex flex-col w-[420px] max-w-full bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('h-2 w-2 rounded-full', COLUMNS.find(c => c.id === localCampaign.kanbanStatus)?.dot || 'bg-muted-foreground')} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {COLUMNS.find(c => c.id === localCampaign.kanbanStatus)?.label}
            </span>
          </div>
          <h2 className="text-sm font-black text-foreground leading-snug">{localCampaign.name}</h2>
          {localCampaign.objective && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">{localCampaign.objective}</p>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Meta row */}
        <div className="p-4 space-y-4 border-b border-border">
          {/* Assign */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Responsável</p>
            <div className="flex gap-2">
              {TEAM.map(t => (
                <button
                  key={t.id}
                  onClick={() => assignTo(t.name)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all flex-1',
                    localCampaign.responsible.toLowerCase().includes(t.id)
                      ? `${t.bg} ${t.border} ${t.text} ring-1 ${t.ring}`
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black text-white', t.color)}>{t.initials}</div>
                  <div className="text-left">
                    <p className="font-bold leading-none">{t.name}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">{t.role.split('·')[0].trim()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Move column */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Mover para</p>
            <div className="flex flex-wrap gap-1.5">
              {COLUMNS.map(col => (
                <button
                  key={col.id}
                  onClick={() => moveToColumn(col.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all',
                    localCampaign.kanbanStatus === col.id
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Prioridade</p>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-bold gap-1', PRIORITY_STYLE[localCampaign.priority].badge)}>
                {PRIORITY_STYLE[localCampaign.priority].icon} {localCampaign.priority}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Prazo</p>
              {localCampaign.endDate ? (
                <div className="flex items-center gap-1.5">
                  <DeadlineBadge dateStr={localCampaign.endDate} />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(localCampaign.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ) : <span className="text-[11px] text-muted-foreground/40">Sem prazo</span>}
            </div>
          </div>

          {/* Channels */}
          {localCampaign.channel.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Canais</p>
              <div className="flex flex-wrap gap-1">
                {localCampaign.channel.map(ch => (
                  <span key={ch} className="rounded-lg bg-muted/50 border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{CHANNEL_ICON[ch]} {ch}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Google Drive link ── */}
        <div className="px-4 py-3 border-b border-border">
          {driveLink && !editingDrive ? (
            <a
              href={driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-3 hover:border-primary/30 hover:from-primary/8 hover:to-transparent transition-all duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Google Drive icon */}
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
                <svg viewBox="0 0 87.3 78" className="h-5 w-5">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53.5H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="M43.65 25L29.9 1.4C28.55.6 27 .2 25.45.2c-1.55 0-3.1.4-4.45 1.2L6.6 25H43.65z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H60.2l5.5 9.9z" fill="#ea4335"/>
                  <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.95.2H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
                  <path d="M60.2 53.5H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2z" fill="#2684fc"/>
                  <path d="M73.4 26.5l-14.45-25c-1.35-.8-2.9-1.3-4.45-1.3H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25h26.6l3.15-1.5z" fill="#ffba00"/>
                  <path d="M43.65 25H17.05L6.6 25l17.25 28.5H60.2L43.65 25z" fill="#fff" opacity=".1"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Criativo · Google Drive</p>
                <p className="text-xs font-semibold text-foreground/80 truncate group-hover:text-primary transition-colors">
                  {driveLink.replace(/^https?:\/\/(drive\.google\.com)?/, '').slice(0, 40) || driveLink}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingDrive(true); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </a>
          ) : editingDrive ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Link do criativo (Google Drive)</p>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="https://drive.google.com/..."
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveDriveLink(driveLink); if (e.key === 'Escape') setEditingDrive(false); }}
                  className="h-8 text-xs bg-muted/20 border-border/60 flex-1"
                />
                <Button size="sm" onClick={() => saveDriveLink(driveLink)} className="h-8 px-3 bg-primary/90 text-primary-foreground border-0 text-xs">Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingDrive(false)} className="h-8 px-2"><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingDrive(true)}
              className="group flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-border/50 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/40 border border-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                <FolderOpen className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Adicionar link do criativo</p>
                <p className="text-[10px] text-muted-foreground/50">Google Drive · Pasta ou arquivo</p>
              </div>
              <Link2 className="ml-auto h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
            </button>
          )}
        </div>

        {/* Subtasks */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Tarefas {localCampaign.subtasks.length > 0 && `(${doneSubtasks}/${localCampaign.subtasks.length})`}
            </p>
          </div>
          {localCampaign.subtasks.length > 0 && (
            <div className="mb-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${localCampaign.subtasks.length ? (doneSubtasks / localCampaign.subtasks.length) * 100 : 0}%` }}
              />
            </div>
          )}
          <div className="space-y-1">
            {localCampaign.subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors group">
                <button
                  onClick={() => toggleSubtask(st.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {st.done
                    ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    : <Square className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                  }
                  <span className={cn('text-xs', st.done ? 'line-through text-muted-foreground/40' : 'text-foreground/85')}>{st.title}</span>
                </button>
                {!st.done && onConvertSubtask && (
                  <button
                    onClick={() => onConvertSubtask(st, localCampaign)}
                    title="Criar como tarefa no Kanban"
                    className="shrink-0 opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <Input
              placeholder="+ Nova subtarefa"
              value={editingSubtask}
              onChange={e => setEditingSubtask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubtask()}
              className="h-7 text-xs bg-muted/20 border-border/60"
            />
            <Button size="sm" variant="ghost" onClick={addSubtask} className="h-7 px-2 text-xs">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Quick Mention / Tag for workflow */}
        <QuickMentionSection
          campaign={localCampaign}
          onMention={(memberName, action) => {
            const entry = { date: new Date().toISOString(), action: `📌 @${memberName} — ${action}`, user: 'Sistema' };
            const updated = { ...localCampaign, history: [...localCampaign.history, entry] };
            setLocalCampaign(updated);
            onSave(updated);
          }}
        />

        {/* Comments */}
        <div className="p-4 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">
            Comentários {comments.length > 0 && `(${comments.length})`}
          </p>
          <div className="space-y-3 mb-3">
            {comments.length === 0 && (
              <p className="text-[11px] text-muted-foreground/40 text-center py-2">Nenhum comentário ainda</p>
            )}
            {comments.map(c => {
              const cMember = getTeamMember(c.user);
              return (
                <div key={c.date} className="flex gap-2">
                  <TeamAvatar responsible={c.user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn('text-[10px] font-bold', cMember ? cMember.text : 'text-foreground')}>{c.user}</span>
                      <span className="text-[9px] text-muted-foreground/40">
                        {new Date(c.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} {new Date(c.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/80 leading-snug mt-0.5 bg-muted/30 rounded-lg px-2.5 py-1.5">
                      {c.action.slice(2).trim()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comment input */}
          <div className="space-y-2">
            <div className="flex gap-1">
              {TEAM.map(t => (
                <button
                  key={t.id}
                  onClick={() => setCommentAuthor(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold transition-all',
                    commentAuthor === t.id ? `${t.bg} ${t.border} ${t.text}` : 'border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <div className={cn('h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white', t.color)}>{t.initials[0]}</div>
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Textarea
                placeholder="Adicionar comentário..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={2}
                className="text-xs bg-muted/20 border-border/60 resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addComment(); }}
              />
              <Button size="sm" onClick={addComment} className="self-end bg-primary/90 text-primary-foreground border-0 px-2">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Activity log */}
        {activity.length > 0 && (
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Histórico</p>
            <div className="space-y-2">
              {[...activity].reverse().slice(0, 8).map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                  <div>
                    <span className="text-[10px] text-foreground/60">{h.action}</span>
                    <span className="ml-1 text-[9px] text-muted-foreground/40">
                      · {h.user} · {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Card Modal (Campaign-linked Creative Task) ──────────────────────────

const CREATIVE_TYPES = [
  { id: 'carrossel', label: 'Carrossel', icon: '🎠' },
  { id: 'post', label: 'Post', icon: '📸' },
  { id: 'reels', label: 'Reels', icon: '🎬' },
  { id: 'stories', label: 'Stories', icon: '📱' },
  { id: 'video', label: 'Vídeo', icon: '🎥' },
  { id: 'ads', label: 'Ads', icon: '📊' },
  { id: 'shorts', label: 'Shorts', icon: '⚡' },
];

const DESTINATION_PLATFORMS = ['Meta Ads', 'Instagram Orgânico', 'TikTok', 'LinkedIn', 'Google Ads', 'YouTube'];

function NewCardModal({ open, onClose, columnId, onSave, onSaveCreativeTask, campaigns }: {
  open: boolean; onClose: () => void; columnId: KanbanStatus;
  onSave: (data: Partial<Campaign>) => void;
  onSaveCreativeTask: (task: Partial<CampaignTask>) => Promise<void>;
  campaigns: Campaign[];
}) {
  const [mode, setMode] = useState<'simple' | 'campaign'>('campaign');
  const [name, setName] = useState('');
  const [responsible, setResponsible] = useState<TeamMemberId>('guilherme');
  const [priority, setPriority] = useState<Priority>('Média');
  const [endDate, setEndDate] = useState('');
  const [channel, setChannel] = useState('Meta Ads');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [creativeType, setCreativeType] = useState('carrossel');
  const [driveLink, setDriveLink] = useState('');
  const [destinationPlatform, setDestinationPlatform] = useState('Meta Ads');
  const [description, setDescription] = useState('');

  const activeCampaigns = campaigns.filter(c => c.status === 'Ativa' || c.status === 'Aprovada' || c.status === 'Rascunho');
  const selectedCampaign = activeCampaigns.find(c => c.id === selectedCampaignId);

  const handleSave = async () => {
    if (mode === 'simple') {
      if (!name.trim()) return;
      const member = TEAM.find(t => t.id === responsible)!;
      onSave({ name, channel: [channel as Channel], priority, responsible: member.name, avatar: member.initials, endDate });
      resetAndClose();
      return;
    }
    // Campaign-linked creative task
    if (!name.trim() || !selectedCampaignId) return;
    const member = TEAM.find(t => t.id === responsible)!;
    await onSaveCreativeTask({
      campaign_id: selectedCampaignId,
      campaign_name: selectedCampaign?.name || '',
      title: name,
      description: description || null,
      creative_type: creativeType,
      channel,
      priority,
      assigned_to: member.name,
      deadline: endDate || null,
      drive_link: driveLink || null,
      destination_platform: destinationPlatform,
      status: TASK_STATUS_REVERSE[columnId] || 'pending',
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setName(''); setEndDate(''); setDriveLink(''); setDescription(''); setSelectedCampaignId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Nova tarefa — <span className="text-primary">{COLUMNS.find(c => c.id === columnId)?.label}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1.5 mb-1">
          <button onClick={() => setMode('campaign')} className={cn('flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-all', mode === 'campaign' ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground')}>
            🎯 Vincular a Campanha
          </button>
          <button onClick={() => setMode('simple')} className={cn('flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-all', mode === 'simple' ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground')}>
            📝 Tarefa Simples
          </button>
        </div>

        <div className="space-y-3">
          {/* Campaign selector (campaign mode) */}
          {mode === 'campaign' && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Campanha *</p>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="bg-muted/20 border-border/60 h-9 text-xs"><SelectValue placeholder="Selecione uma campanha..." /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {activeCampaigns.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} <span className="text-muted-foreground/50 ml-1">({c.status})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Input placeholder="Nome da tarefa *" value={name} onChange={e => setName(e.target.value)} className="bg-muted/20 border-border/60" autoFocus />

          {mode === 'campaign' && (
            <Textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="bg-muted/20 border-border/60 text-xs resize-none" />
          )}

          {/* Creative type (campaign mode) */}
          {mode === 'campaign' && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Tipo de Criativo</p>
              <div className="flex flex-wrap gap-1.5">
                {CREATIVE_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => setCreativeType(ct.id)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all',
                      creativeType === ct.id ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'
                    )}>
                    {ct.icon} {ct.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Responsável</p>
            <div className="flex gap-1.5 flex-wrap">
              {TEAM.map(t => (
                <button
                  key={t.id}
                  onClick={() => setResponsible(t.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all',
                    responsible === t.id ? `${t.bg} ${t.border} ${t.text}` : 'border-border text-muted-foreground hover:border-primary/20'
                  )}
                >
                  <div className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black text-white', t.color)}>{t.initials}</div>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Canal</p>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="bg-muted/20 border-border/60 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.keys(CHANNEL_ICON).map(c => <SelectItem key={c} value={c} className="text-xs">{CHANNEL_ICON[c]} {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Prioridade</p>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger className="bg-muted/20 border-border/60 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {(['Alta', 'Média', 'Baixa'] as Priority[]).map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Destination platform (campaign mode) */}
          {mode === 'campaign' && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Plataforma de destino</p>
              <Select value={destinationPlatform} onValueChange={setDestinationPlatform}>
                <SelectTrigger className="bg-muted/20 border-border/60 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {DESTINATION_PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Prazo</p>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-muted/20 border-border/60 h-8 text-xs" />
          </div>

          {/* Drive link (campaign mode) */}
          {mode === 'campaign' && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Link do ativo (Google Drive)</p>
              <Input placeholder="https://drive.google.com/..." value={driveLink} onChange={e => setDriveLink(e.target.value)} className="bg-muted/20 border-border/60 h-8 text-xs" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={resetAndClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={mode === 'campaign' ? (!name.trim() || !selectedCampaignId) : !name.trim()} className="bg-primary text-primary-foreground border-0">
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Task Types ──────────────────────────────────────────────────────

interface CampaignTask {
  id: string;
  user_id: string;
  campaign_id: string;
  campaign_name: string;
  title: string;
  description: string | null;
  creative_type: string;
  channel: string;
  format_width: number | null;
  format_height: number | null;
  format_ratio: string | null;
  format_name: string | null;
  status: string;
  priority: string;
  assigned_to: string;
  approved_by: string | null;
  approval_note: string | null;
  deadline: string | null;
  campaign_context: Record<string, any>;
  creative_output: Record<string, any>;
  created_at: string;
  drive_link: string | null;
  asset_name: string | null;
  destination_platform: string | null;
}

const TASK_STATUS_MAP: Record<string, KanbanStatus> = {
  pending: 'ideia',
  in_progress: 'desenvolvimento',
  in_review: 'revisao',
  approved: 'aprovado',
  rejected: 'desenvolvimento',
  published: 'publicado',
};

const TASK_STATUS_REVERSE: Record<KanbanStatus, string> = {
  ideia: 'pending',
  desenvolvimento: 'in_progress',
  revisao: 'in_review',
  aprovado: 'approved',
  publicado: 'published',
};

const CREATIVE_TYPE_ICON: Record<string, string> = {
  carrossel: '🎠',
  reels: '🎬',
  stories: '📱',
  post: '📸',
  video: '🎥',
  ads: '📊',
  shorts: '⚡',
};

const CREATIVE_TYPE_ROUTE: Record<string, string> = {
  carrossel: '/ai-carrosseis',
  post: '/criativo',
  reels: '/video-ia',
  stories: '/video-ia',
  video: '/video-ia',
  ads: '/criativo',
  shorts: '/video-ia',
};

// ─── Edit Task Modal ──────────────────────────────────────────────────────────

function EditTaskModal({ open, onClose, task, onSave }: {
  open: boolean; onClose: () => void; task: CampaignTask;
  onSave: (updates: Partial<CampaignTask>) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState<TeamMemberId>(
    TEAM.find(t => task.assigned_to.toLowerCase().includes(t.id))?.id || 'guilherme'
  );
  const [priority, setPriority] = useState(task.priority);
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [status, setStatus] = useState(task.status);

  const handleSave = () => {
    if (!title.trim()) return;
    const member = TEAM.find(t => t.id === assignedTo)!;
    onSave({ title, description: description || null, assigned_to: member.name, priority, deadline: deadline || null, status });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" />
            Editar tarefa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título *" value={title} onChange={e => setTitle(e.target.value)} className="bg-muted/20 border-border/60" autoFocus />
          <Textarea placeholder="Descrição..." value={description} onChange={e => setDescription(e.target.value)} rows={2} className="bg-muted/20 border-border/60 text-xs resize-none" />

          <div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Responsável</p>
            <div className="flex gap-1.5 flex-wrap">
              {TEAM.map(t => (
                <button key={t.id} onClick={() => setAssignedTo(t.id)}
                  className={cn('flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all',
                    assignedTo === t.id ? `${t.bg} ${t.border} ${t.text}` : 'border-border text-muted-foreground hover:border-primary/20'
                  )}>
                  <div className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black text-white', t.color)}>{t.initials}</div>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Prioridade</p>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-muted/20 border-border/60 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {['Alta', 'Média', 'Baixa'].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Status</p>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-muted/20 border-border/60 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(TASK_STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{COLUMNS.find(c => c.id === v)?.label || k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Prazo</p>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="bg-muted/20 border-border/60 h-8 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground border-0">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Creative Task Card ───────────────────────────────────────────────────────

function CreativeTaskCard({
  task,
  onClick,
  onStatusChange,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  selected,
  onToggleSelect,
}: {
  task: CampaignTask;
  onClick?: () => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string, note: string) => void;
  onEdit?: (task: CampaignTask) => void;
  onDelete?: (taskId: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const member = getTeamMember(task.assigned_to);
  const daysLeft = getDaysLeft(task.deadline || undefined);
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const route = CREATIVE_TYPE_ROUTE[task.creative_type] || '/criativo';

  const handleOpenTool = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${route}?taskId=${task.id}`);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3 cursor-pointer',
        'transition-all duration-150 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10',
        isOverdue && 'border-red-500/40 from-red-500/5',
      )}
    >
      {/* Select checkbox */}
      {onToggleSelect && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(task.id); }}
          className={cn('absolute top-2 left-2 h-4 w-4 rounded border flex items-center justify-center transition-all z-10',
            selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary/50 opacity-0 group-hover:opacity-100'
          )}
        >
          {selected && <CheckCheck className="h-2.5 w-2.5" />}
        </button>
      )}

      {/* Action buttons (edit/delete) */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={e => { e.stopPropagation(); onEdit?.(task); }}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Edit2 className="h-3 w-3" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete?.(task.id); }}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Campaign badge */}
      <div className="flex items-center gap-1.5 mb-2 mt-1">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary truncate max-w-[140px]">
          🎯 {task.campaign_name}
        </span>
        <span className="text-[9px] text-muted-foreground/50">
          {CREATIVE_TYPE_ICON[task.creative_type]} {task.creative_type}
        </span>
      </div>

      {/* Title */}
      <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2 mb-1.5">{task.title}</p>

      {/* Format specs */}
      {task.format_width && task.format_height && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">
            {task.format_width}×{task.format_height}
          </span>
          {task.format_ratio && (
            <span className="text-[9px] text-muted-foreground/60">{task.format_ratio}</span>
          )}
          <span className="text-[9px] text-muted-foreground/40">· {task.channel}</span>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold',
          task.priority === 'Alta' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
          task.priority === 'Média' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
          'bg-muted/50 text-muted-foreground border-border'
        )}>
          {task.priority}
        </span>
        <DeadlineBadge dateStr={task.deadline || undefined} />
      </div>

      {/* Drive link */}
      {task.drive_link && (
        <a
          href={task.drive_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 w-full rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors mb-2"
        >
          <FolderOpen className="h-3 w-3" />
          <span className="truncate flex-1">Ativo no Drive</span>
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
        </a>
      )}

      {/* Destination platform */}
      {task.destination_platform && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-400 mb-2">
          🎯 {task.destination_platform}
        </span>
      )}

      {/* Open tool button */}
      <button
        onClick={handleOpenTool}
        className="flex items-center gap-1.5 w-full rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors mb-2"
      >
        {task.creative_type === 'video' || task.creative_type === 'reels' || task.creative_type === 'stories' || task.creative_type === 'shorts'
          ? <Video className="h-3 w-3" />
          : <Palette className="h-3 w-3" />
        }
        Abrir Ferramenta
        <ArrowRight className="h-3 w-3 ml-auto" />
      </button>

      {/* Approval buttons for in_review status */}
      {task.status === 'in_review' && (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove?.(task.id); }}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-500/15 border border-green-500/25 px-2 py-1.5 text-[10px] font-bold text-green-400 hover:bg-green-500/25 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Aprovar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const note = prompt('Nota de feedback para Guilherme:');
              if (note) onReject?.(task.id, note);
            }}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-500/15 border border-red-500/25 px-2 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/25 transition-colors"
          >
            <XCircle className="h-3 w-3" /> Rejeitar
          </button>
        </div>
      )}

      {/* Footer: avatar */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TeamAvatar responsible={task.assigned_to} size="sm" />
          <span className={cn('text-[9px] font-semibold', member ? member.text : 'text-muted-foreground')}>
            {task.assigned_to}
          </span>
        </div>
        {task.approved_by && (
          <span className="text-[9px] text-green-400 flex items-center gap-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" /> {task.approved_by}
          </span>
        )}
      </div>

      {/* Asset name (approved) */}
      {task.asset_name && task.status === 'approved' && (
        <div className="mt-2 rounded-lg bg-green-500/10 border border-green-500/20 px-2 py-1.5">
          <p className="text-[9px] text-green-400 font-semibold mb-0.5">Nome do ativo:</p>
          <p className="text-[10px] text-foreground/70 font-mono">{task.asset_name}</p>
        </div>
      )}

      {/* Rejection note */}
      {task.approval_note && task.status === 'in_progress' && (
        <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5">
          <p className="text-[9px] text-red-400 font-semibold mb-0.5">Feedback:</p>
          <p className="text-[10px] text-foreground/70">{task.approval_note}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Kanban ─────────────────────────────────────────────────────────────

export default function Kanban() {
  const { campaigns, setCampaigns } = useCampaigns();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCardColumn, setNewCardColumn] = useState<KanbanStatus | null>(null);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [creativeTasks, setCreativeTasks] = useState<CampaignTask[]>([]);
  const [editingTask, setEditingTask] = useState<CampaignTask | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${bulkSelected.size} item(ns)?`)) return;
    const campaignIds = [...bulkSelected].filter(id => campaigns.some(c => c.id === id));
    const taskIds = [...bulkSelected].filter(id => creativeTasks.some(t => t.id === id));
    if (campaignIds.length > 0) {
      setCampaigns(prev => prev.filter(c => !campaignIds.includes(c.id)));
    }
    for (const tid of taskIds) {
      await (supabase as any).from('campaign_tasks').delete().eq('id', tid);
    }
    if (taskIds.length > 0) {
      setCreativeTasks(prev => prev.filter(t => !taskIds.includes(t.id)));
    }
    setBulkSelected(new Set());
    toast({ title: `🗑️ ${bulkSelected.size} item(ns) excluído(s)` });
  };

  const handleBulkMove = async (col: KanbanStatus) => {
    const campaignIds = [...bulkSelected].filter(id => campaigns.some(c => c.id === id));
    const taskIds = [...bulkSelected].filter(id => creativeTasks.some(t => t.id === id));
    if (campaignIds.length > 0) {
      setCampaigns(prev => prev.map(c => campaignIds.includes(c.id) ? { ...c, kanbanStatus: col } : c));
    }
    const newStatus = TASK_STATUS_REVERSE[col] || 'pending';
    for (const tid of taskIds) {
      await (supabase as any).from('campaign_tasks').update({ status: newStatus }).eq('id', tid);
    }
    if (taskIds.length > 0) {
      setCreativeTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, status: newStatus } : t));
    }
    setBulkSelected(new Set());
    toast({ title: `✅ ${bulkSelected.size} item(ns) movido(s) para ${COLUMNS.find(c => c.id === col)?.label}` });
  };

  const handleConvertSubtask = async (subtask: { title: string }, campaign: Campaign) => {
    if (!user) return;
    const taskData = {
      user_id: user.id,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      title: subtask.title,
      creative_type: 'post',
      channel: campaign.channel[0] || 'Meta Ads',
      priority: campaign.priority || 'Média',
      assigned_to: campaign.responsible || 'Guilherme',
      status: 'pending',
    };
    const { error, data } = await (supabase as any).from('campaign_tasks').insert(taskData).select().single();
    if (!error && data) {
      setCreativeTasks(prev => [...prev, data]);
      toast({ title: '✅ Subtarefa convertida em tarefa!', description: `"${subtask.title}" criada no Kanban.` });
    } else {
      toast({ title: 'Erro', description: error?.message, variant: 'destructive' });
    }
  };

  // Load creative tasks from database
  useEffect(() => {
    if (!user) return;
    const loadTasks = async () => {
      const { data, error } = await (supabase as any).from('campaign_tasks').select('*').order('created_at');
      if (data && !error) setCreativeTasks(data);
    };
    loadTasks();
  }, [user]);

  const handleEditTask = async (taskId: string, updates: Partial<CampaignTask>) => {
    const { error } = await (supabase as any).from('campaign_tasks').update(updates).eq('id', taskId);
    if (!error) {
      setCreativeTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast({ title: '✅ Tarefa atualizada' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    const { error } = await (supabase as any).from('campaign_tasks').delete().eq('id', taskId);
    if (!error) {
      setCreativeTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: '🗑️ Tarefa excluída' });
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await (supabase as any).from('campaign_tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) {
      setCreativeTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  const [approvalModal, setApprovalModal] = useState<{ taskId: string; open: boolean }>({ taskId: '', open: false });
  const [approvalAssetName, setApprovalAssetName] = useState('');
  const [approvalDriveLink, setApprovalDriveLink] = useState('');

  const handleApproveTask = async (taskId: string) => {
    const task = creativeTasks.find(t => t.id === taskId);
    setApprovalAssetName('');
    setApprovalDriveLink(task?.drive_link || '');
    setApprovalModal({ taskId, open: true });
  };

  const confirmApproval = async () => {
    const taskId = approvalModal.taskId;
    const task = creativeTasks.find(t => t.id === taskId);
    if (!task || !approvalAssetName.trim()) return;

    // Update task as approved with asset name
    const { error } = await (supabase as any).from('campaign_tasks').update({
      status: 'approved',
      approved_by: 'Gabriel',
      completed_at: new Date().toISOString(),
      asset_name: approvalAssetName.trim(),
      drive_link: approvalDriveLink.trim() || task.drive_link,
    }).eq('id', taskId);

    if (!error) {
      // Register as active creative
      if (user) {
        await (supabase as any).from('active_creatives').insert({
          user_id: user.id,
          title: approvalAssetName.trim(),
          platform: task.destination_platform || task.channel,
          format_type: task.creative_type,
          dimensions: task.format_width && task.format_height ? `${task.format_width}x${task.format_height}` : null,
          campaign_id: task.campaign_id,
          status: 'active',
          file_url: approvalDriveLink.trim() || task.drive_link,
          notes: `Campanha: ${task.campaign_name} | Tipo: ${task.creative_type} | Canal: ${task.channel}`,
          tags: [task.creative_type, task.channel, task.campaign_name].filter(Boolean),
        });
      }

      setCreativeTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'approved', approved_by: 'Gabriel', asset_name: approvalAssetName.trim() } : t));
      toast({ title: '✅ Ativo aprovado e registrado!', description: `"${approvalAssetName.trim()}" enviado para Criativos Ativos.` });
    }
    setApprovalModal({ taskId: '', open: false });
  };

  const handleRejectTask = async (taskId: string, note: string) => {
    const { error } = await (supabase as any).from('campaign_tasks').update({
      status: 'in_progress',
      approval_note: note,
    }).eq('id', taskId);
    if (!error) {
      setCreativeTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'in_progress', approval_note: note } : t));
      toast({ title: '🔄 Tarefa devolvida com feedback' });
    }
  };

  const handleCreateCreativeTask = async (taskData: Partial<CampaignTask>) => {
    if (!user) return;
    const { error, data } = await (supabase as any).from('campaign_tasks').insert({
      ...taskData,
      user_id: user.id,
    }).select().single();
    if (!error && data) {
      setCreativeTasks(prev => [...prev, data]);
      toast({ title: '✅ Tarefa criativa criada!', description: `Vinculada à campanha "${taskData.campaign_name}"` });
    } else {
      toast({ title: 'Erro ao criar tarefa', description: error?.message, variant: 'destructive' });
    }
  };

  // Campaigns now loaded from DB via useCampaigns hook

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = useMemo(() => campaigns.filter(c => {
    if (filterMember !== 'all' && !c.responsible.toLowerCase().includes(filterMember)) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    return true;
  }), [campaigns, filterMember, filterPriority]);

  const filteredTasks = useMemo(() => creativeTasks.filter(t => {
    if (filterMember !== 'all' && !t.assigned_to.toLowerCase().includes(filterMember)) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  }), [creativeTasks, filterMember, filterPriority]);

  const byColumn = (col: KanbanStatus) => filtered.filter(c => c.kanbanStatus === col);
  const tasksByColumn = (col: KanbanStatus) => filteredTasks.filter(t => TASK_STATUS_MAP[t.status] === col);

  // Team stats — include creative tasks
  const teamStats = useMemo(() => TEAM.map(t => {
    const campaignTasks = campaigns.filter(c => c.responsible.toLowerCase().includes(t.id));
    const dbTasks = creativeTasks.filter(ct => ct.assigned_to.toLowerCase().includes(t.id));
    const allCount = campaignTasks.length + dbTasks.length;
    const overdue = campaignTasks.filter(c => getDaysLeft(c.endDate) !== null && getDaysLeft(c.endDate)! < 0).length
      + dbTasks.filter(ct => getDaysLeft(ct.deadline || undefined) !== null && getDaysLeft(ct.deadline || undefined)! < 0).length;
    const done = campaignTasks.filter(c => c.kanbanStatus === 'publicado').length
      + dbTasks.filter(ct => ct.status === 'approved' || ct.status === 'published').length;
    return { ...t, total: allCount, overdue, done };
  }), [campaigns, creativeTasks]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const overId = over.id as string;
    const colMatch = COLUMNS.find(c => c.id === overId);
    const targetColumn = colMatch ? colMatch.id : campaigns.find(c => c.id === overId)?.kanbanStatus;
    if (targetColumn) {
      // Check if it's a creative task (UUID format)
      const isCreativeTask = creativeTasks.some(t => t.id === active.id);
      if (isCreativeTask) {
        const newStatus = TASK_STATUS_REVERSE[targetColumn] || 'pending';
        handleTaskStatusChange(active.id as string, newStatus);
      } else {
        setCampaigns(prev => prev.map(c =>
          c.id === active.id ? {
            ...c, kanbanStatus: targetColumn,
            history: [...(c.history || []), { date: new Date().toISOString(), action: `Movido para "${COLUMNS.find(col => col.id === targetColumn)?.label}"`, user: c.responsible }]
          } : c
        ));
      }
    }
  };

  const handleAddCard = (data: Partial<Campaign>) => {
    const newCard: Campaign = {
      id: `camp-${Date.now()}`,
      name: data.name ?? 'Nova tarefa',
      channel: data.channel ?? ['Meta Ads'],
      status: 'Rascunho',
      kanbanStatus: newCardColumn ?? 'ideia',
      priority: data.priority ?? 'Média',
      category: 'Awareness' as ContentObjective,
      responsible: data.responsible ?? 'Gabriel',
      avatar: data.avatar ?? 'GA',
      startDate: new Date().toISOString().split('T')[0],
      endDate: data.endDate ?? '',
      budget: 0, funnel: 'Topo',
      objective: '', audience: '', description: '',
      subtasks: [], links: [],
      history: [{ date: new Date().toISOString(), action: 'Tarefa criada', user: data.responsible ?? 'Gabriel' }],
    };
    setCampaigns(prev => [...prev, newCard]);
  };

  const handleSaveCard = (updated: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDelete = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const activeCampaign = campaigns.find(c => c.id === activeId);
  const selectedCampaign = campaigns.find(c => c.id === selectedId);

  // Total stats
  const totalOverdue = campaigns.filter(c => getDaysLeft(c.endDate) !== null && getDaysLeft(c.endDate)! < 0 && c.kanbanStatus !== 'publicado').length;
  const totalUrgent  = campaigns.filter(c => { const d = getDaysLeft(c.endDate); return d !== null && d >= 0 && d <= 3 && c.kanbanStatus !== 'publicado'; }).length;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 h-full">

      {/* ── Team header ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 flex-wrap">
        {teamStats.map(t => (
          <div
            key={t.id}
            onClick={() => setFilterMember(filterMember === t.id ? 'all' : t.id)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all',
              filterMember === t.id ? `${t.bg} ${t.border}` : 'border-border bg-card hover:border-primary/20'
            )}
          >
            <div className={cn('h-9 w-9 rounded-full flex items-center justify-center font-black text-sm text-white ring-2 ring-offset-2 ring-offset-card', t.color, filterMember === t.id ? t.ring : 'ring-transparent')}>
              {t.initials}
            </div>
            <div>
              <p className={cn('text-sm font-black', filterMember === t.id ? t.text : 'text-foreground')}>{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.role}</p>
            </div>
            <div className="ml-2 flex gap-2 text-center">
              <div>
                <p className="text-lg font-black text-foreground leading-none">{t.total}</p>
                <p className="text-[9px] text-muted-foreground/60">tarefas</p>
              </div>
              {t.overdue > 0 && (
                <div>
                  <p className="text-lg font-black text-red-400 leading-none">{t.overdue}</p>
                  <p className="text-[9px] text-muted-foreground/60">atrasadas</p>
                </div>
              )}
              <div>
                <p className="text-lg font-black text-green-400 leading-none">{t.done}</p>
                <p className="text-[9px] text-muted-foreground/60">feitas</p>
              </div>
            </div>
          </div>
        ))}

        {/* Urgency alerts */}
        <div className="ml-auto flex flex-col gap-1.5">
          {totalOverdue > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {totalOverdue} atrasada{totalOverdue > 1 ? 's' : ''}
            </div>
          )}
          {totalUrgent > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400">
              <Clock className="h-3.5 w-3.5" /> {totalUrgent} urgente{totalUrgent > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
        {(['all', 'Alta', 'Média', 'Baixa'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
              filterPriority === p
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'border-border text-muted-foreground hover:border-primary/30'
            )}
          >
            {p === 'all' ? 'Todas' : `${PRIORITY_STYLE[p].icon} ${p}`}
          </button>
        ))}
        {(filterPriority !== 'all' || filterMember !== 'all') && (
          <button
            onClick={() => { setFilterPriority('all'); setFilterMember('all'); }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground/50">
          {filtered.length + filteredTasks.length} tarefa{(filtered.length + filteredTasks.length) !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => { setBulkMode(!bulkMode); if (bulkMode) setBulkSelected(new Set()); }}
          className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
            bulkMode ? 'bg-primary/20 text-primary border-primary/30' : 'border-border text-muted-foreground hover:border-primary/30'
          )}
        >
          <CheckCheck className="h-3 w-3 inline mr-1" /> {bulkMode ? 'Sair seleção' : 'Selecionar'}
        </button>


      {/* ── Edit task modal ────────────────────────────────────────────────── */}
      {editingTask && (
        <EditTaskModal
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onSave={updates => handleEditTask(editingTask.id, updates)}
        />
      )}
    </div>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const cards = byColumn(col.id);
            const colTasks = tasksByColumn(col.id);
            const totalInCol = cards.length + colTasks.length;
            const overloaded = totalInCol >= 5;
            const overdueInCol = cards.filter(c => getDaysLeft(c.endDate) !== null && getDaysLeft(c.endDate)! < 0).length;

            return (
              <div key={col.id} className="flex w-64 shrink-0 flex-col gap-2">
                {/* Column header */}
                <div className={cn('rounded-xl border-t-2 border border-border bg-card/60 px-3 py-2.5', col.accent)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-foreground">{col.label}</h3>
                      {overdueInCol > 0 && (
                        <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                          {overdueInCol}⚠
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        overloaded ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
                      )}>
                        {totalInCol}
                      </span>
                      <button
                        onClick={() => setNewCardColumn(col.id)}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Column progress bar */}
                  {col.id !== 'ideia' && (
                    <div className="mt-2 h-0.5 rounded-full bg-muted/50 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', col.dot)} style={{
                        width: campaigns.length ? `${(campaigns.filter(c => {
                          const idx = COLUMNS.findIndex(cl => cl.id === col.id);
                          return COLUMNS.findIndex(cl => cl.id === c.kanbanStatus) >= idx;
                        }).length / campaigns.length) * 100}%` : '0%'
                      }} />
                    </div>
                  )}
                </div>

                {/* Drop zone */}
                <SortableContext items={[...cards.map(c => c.id), ...colTasks.map(t => t.id)]} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2 min-h-[120px] rounded-xl border-2 border-dashed border-transparent transition-colors">
                    {/* Creative task cards (from DB) */}
                    {colTasks.map(task => (
                      <CreativeTaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleTaskStatusChange}
                        onApprove={handleApproveTask}
                        onReject={handleRejectTask}
                        onEdit={t => setEditingTask(t)}
                        onDelete={handleDeleteTask}
                        selected={bulkSelected.has(task.id)}
                        onToggleSelect={bulkMode ? toggleBulkSelect : undefined}
                      />
                    ))}
                    {/* Campaign cards (from localStorage) */}
                    {cards.map(card => (
                      <KanbanCard
                        key={card.id}
                        campaign={card}
                        onClick={() => !bulkMode && setSelectedId(card.id)}
                        onDelete={handleDelete}
                        selected={bulkSelected.has(card.id)}
                        onToggleSelect={bulkMode ? toggleBulkSelect : undefined}
                      />
                    ))}
                    {totalInCol === 0 && (
                      <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border/40 text-[10px] text-muted-foreground/30">
                        Solte aqui
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeCampaign && <KanbanCard campaign={activeCampaign} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* ── Bulk action bar ────────────────────────────────────────────────── */}
      {bulkMode && bulkSelected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md px-5 py-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <span className="text-xs font-bold text-primary">{bulkSelected.size} selecionado(s)</span>
          <div className="h-4 w-px bg-border" />
          {COLUMNS.map(col => (
            <button
              key={col.id}
              onClick={() => handleBulkMove(col.id)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
            >
              <Move className="h-3 w-3" /> {col.label}
            </button>
          ))}
          <div className="h-4 w-px bg-border" />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 rounded-lg bg-red-500/15 border border-red-500/25 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/25 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> Excluir
          </button>
          <button
            onClick={() => { setBulkSelected(new Set()); setBulkMode(false); }}
            className="ml-1 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── New card modal ─────────────────────────────────────────────────── */}
      {newCardColumn && (
        <NewCardModal
          open={!!newCardColumn}
          onClose={() => setNewCardColumn(null)}
          columnId={newCardColumn}
          onSave={handleAddCard}
          onSaveCreativeTask={handleCreateCreativeTask}
          campaigns={campaigns}
        />
      )}

      {/* ── Approval modal ─────────────────────────────────────────────────── */}
      <Dialog open={approvalModal.open} onOpenChange={o => !o && setApprovalModal({ taskId: '', open: false })}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Aprovar ativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Nome do ativo no gerenciador *</p>
              <Input
                placeholder="Ex: DQEF_Meta_Carrossel_Maio_01"
                value={approvalAssetName}
                onChange={e => setApprovalAssetName(e.target.value)}
                className="bg-muted/20 border-border/60"
                autoFocus
              />
              <p className="text-[9px] text-muted-foreground/50 mt-1">Este nome será registrado no banco de dados para acompanhamento de métricas.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mb-1.5">Link do ativo (Google Drive)</p>
              <Input
                placeholder="https://drive.google.com/..."
                value={approvalDriveLink}
                onChange={e => setApprovalDriveLink(e.target.value)}
                className="bg-muted/20 border-border/60 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setApprovalModal({ taskId: '', open: false })}>Cancelar</Button>
            <Button size="sm" disabled={!approvalAssetName.trim()} onClick={confirmApproval} className="bg-green-600 hover:bg-green-700 text-white border-0">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Aprovar e Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail panel overlay ───────────────────────────────────────────── */}
      {selectedCampaign && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
          />
          <DetailPanel
            campaign={selectedCampaign}
            onClose={() => setSelectedId(null)}
            onSave={handleSaveCard}
            onConvertSubtask={handleConvertSubtask}
          />
        </>
      )}
    </div>
  );
}
