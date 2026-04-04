import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CalendarCheck, Clapperboard, Layers, Image, MessageSquare,
  Zap, Plus, Check, Loader2, Video, BookOpen, Users, Star,
  Building2, Sparkles, RefreshCw,
} from 'lucide-react';

// ─── Playbook-based weekly calendar ────────────────────────────────────────

const PILARES = [
  { key: 'viral', label: 'Viral / Identificação', pct: 30, color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' },
  { key: 'educativo', label: 'Educativo / Útil', pct: 25, color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' },
  { key: 'prova', label: 'Prova Social', pct: 20, color: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30' },
  { key: 'bastidores', label: 'Bastidores / Humano', pct: 15, color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30' },
  { key: 'institucional', label: 'Institucional / Produto', pct: 10, color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30' },
];

interface WeeklySlot {
  day: string;
  dayShort: string;
  instagram: { format: string; pilar: string; icon: React.FC<{ className?: string }> };
  tiktok: { format: string; pilar: string; icon: React.FC<{ className?: string }> };
}

const WEEKLY_CALENDAR: WeeklySlot[] = [
  {
    day: 'Segunda-feira', dayShort: 'SEG',
    instagram: { format: 'Reels', pilar: 'viral', icon: Video },
    tiktok: { format: 'Vídeo Viral', pilar: 'viral', icon: Clapperboard },
  },
  {
    day: 'Terça-feira', dayShort: 'TER',
    instagram: { format: 'Carrossel Educativo', pilar: 'educativo', icon: Layers },
    tiktok: { format: 'Vídeo Educativo', pilar: 'educativo', icon: BookOpen },
  },
  {
    day: 'Quarta-feira', dayShort: 'QUA',
    instagram: { format: 'Reels Prova Social', pilar: 'prova', icon: Star },
    tiktok: { format: 'Antes/Depois', pilar: 'prova', icon: RefreshCw },
  },
  {
    day: 'Quinta-feira', dayShort: 'QUI',
    instagram: { format: 'Stories Interativo', pilar: 'bastidores', icon: MessageSquare },
    tiktok: { format: 'Trend', pilar: 'viral', icon: Zap },
  },
  {
    day: 'Sexta-feira', dayShort: 'SEX',
    instagram: { format: 'Reels Viral', pilar: 'viral', icon: Video },
    tiktok: { format: 'Viral + Teste A/B', pilar: 'viral', icon: Sparkles },
  },
  {
    day: 'Sábado', dayShort: 'SÁB',
    instagram: { format: 'Carrossel Educativo', pilar: 'educativo', icon: Layers },
    tiktok: { format: 'Prova Social', pilar: 'prova', icon: Users },
  },
  {
    day: 'Domingo', dayShort: 'DOM',
    instagram: { format: 'Stories Bastidores', pilar: 'bastidores', icon: Building2 },
    tiktok: { format: 'Conteúdo Leve', pilar: 'bastidores', icon: Image },
  },
];

const FREQ_SUMMARY = [
  { canal: 'Instagram Reels', freq: '4-5x/semana', icon: Video },
  { canal: 'Instagram Carrossel', freq: '2-3x/semana', icon: Layers },
  { canal: 'Instagram Stories', freq: 'Diário', icon: MessageSquare },
  { canal: 'TikTok Vídeo', freq: '5-7x/semana', icon: Clapperboard },
  { canal: 'YouTube Shorts', freq: '3-5x/semana', icon: Video },
  { canal: 'Blog Artigo', freq: '2-4x/mês', icon: BookOpen },
];

function getPilar(key: string) {
  return PILARES.find(p => p.key === key) || PILARES[0];
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function RotinaCriacao() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generatedDays, setGeneratedDays] = useState<Set<string>>(new Set());

  const getNextDate = (dayIndex: number) => {
    const today = new Date();
    const todayDay = today.getDay();
    // Convert: our array is Mon=0..Sun=6, JS Date is Sun=0..Sat=6
    const targetDay = dayIndex === 6 ? 0 : dayIndex + 1;
    let diff = targetDay - todayDay;
    if (diff <= 0) diff += 7;
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next.toISOString().slice(0, 10);
  };

  const generateTasksForDay = useCallback(async (dayIndex: number) => {
    if (!user) return;
    const slot = WEEKLY_CALENDAR[dayIndex];
    const deadline = getNextDate(dayIndex);

    setGenerating(true);
    try {
      const tasks = [
        {
          user_id: user.id,
          campaign_id: 'rotina-semanal',
          campaign_name: 'Rotina Semanal',
          title: `${slot.instagram.format} — Instagram`,
          description: `Pilar: ${getPilar(slot.instagram.pilar).label}. Produzir ${slot.instagram.format} para Instagram conforme calendário do playbook.`,
          channel: 'Instagram',
          creative_type: slot.instagram.format.toLowerCase().includes('carrossel') ? 'carrossel' : slot.instagram.format.toLowerCase().includes('stories') ? 'stories' : 'reels',
          assigned_to: 'Guilherme',
          priority: 'Media',
          status: 'pending',
          deadline,
          format_width: 1080,
          format_height: 1920,
          format_ratio: '9:16',
          format_name: '9:16 Vertical',
        },
        {
          user_id: user.id,
          campaign_id: 'rotina-semanal',
          campaign_name: 'Rotina Semanal',
          title: `${slot.tiktok.format} — TikTok`,
          description: `Pilar: ${getPilar(slot.tiktok.pilar).label}. Produzir ${slot.tiktok.format} para TikTok conforme calendário do playbook.`,
          channel: 'TikTok',
          creative_type: 'video',
          assigned_to: 'Guilherme',
          priority: 'Media',
          status: 'pending',
          deadline,
          format_width: 1080,
          format_height: 1920,
          format_ratio: '9:16',
          format_name: '9:16 Vertical',
        },
      ];

      const { error } = await supabase.from('campaign_tasks').insert(tasks);
      if (error) throw error;

      setGeneratedDays(prev => new Set(prev).add(slot.dayShort));
      toast.success(`Tarefas de ${slot.day} criadas no Kanban!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar tarefas');
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const generateFullWeek = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const allTasks = WEEKLY_CALENDAR.flatMap((slot, i) => {
        const deadline = getNextDate(i);
        return [
          {
            user_id: user.id,
            campaign_id: 'rotina-semanal',
            campaign_name: 'Rotina Semanal',
            title: `${slot.instagram.format} — Instagram`,
            description: `Pilar: ${getPilar(slot.instagram.pilar).label}. Produzir ${slot.instagram.format} para Instagram conforme calendário do playbook.`,
            channel: 'Instagram',
            creative_type: slot.instagram.format.toLowerCase().includes('carrossel') ? 'carrossel' : slot.instagram.format.toLowerCase().includes('stories') ? 'stories' : 'reels',
            assigned_to: 'Guilherme',
            priority: 'Media',
            status: 'pending',
            deadline,
            format_width: 1080,
            format_height: 1920,
            format_ratio: '9:16',
            format_name: '9:16 Vertical',
          },
          {
            user_id: user.id,
            campaign_id: 'rotina-semanal',
            campaign_name: 'Rotina Semanal',
            title: `${slot.tiktok.format} — TikTok`,
            description: `Pilar: ${getPilar(slot.tiktok.pilar).label}. Produzir ${slot.tiktok.format} para TikTok conforme calendário do playbook.`,
            channel: 'TikTok',
            creative_type: 'video',
            assigned_to: 'Guilherme',
            priority: 'Media',
            status: 'pending',
            deadline,
            format_width: 1080,
            format_height: 1920,
            format_ratio: '9:16',
            format_name: '9:16 Vertical',
          },
        ];
      });

      const { error } = await supabase.from('campaign_tasks').insert(allTasks);
      if (error) throw error;

      setGeneratedDays(new Set(WEEKLY_CALENDAR.map(s => s.dayShort)));
      toast.success(`14 tarefas da semana criadas no Kanban!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar tarefas da semana');
    } finally {
      setGenerating(false);
    }
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Rotina Semanal de Criação
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Baseado no Playbook de Marketing — Seção 8: Estrutura de Conteúdo
          </p>
        </div>
        <Button onClick={generateFullWeek} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Gerar Semana Completa
        </Button>
      </div>

      {/* Pilares */}
      <div className="grid grid-cols-5 gap-2">
        {PILARES.map(p => (
          <div key={p.key} className={cn('rounded-xl border p-3 text-center', p.border, 'bg-card')}>
            <div className={cn('text-xl font-black', p.text)}>{p.pct}%</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Frequency summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {FREQ_SUMMARY.map(f => (
          <div key={f.canal} className="rounded-lg border border-border bg-card p-3 text-center">
            <f.icon className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-xs font-bold text-foreground">{f.canal}</p>
            <p className="text-[10px] text-muted-foreground">{f.freq}</p>
          </div>
        ))}
      </div>

      {/* Weekly Calendar Grid */}
      <div className="space-y-2">
        {/* Header row */}
        <div className="grid grid-cols-[120px_1fr_1fr_80px] gap-2 px-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">Dia</div>
          <div className="text-xs font-bold text-muted-foreground uppercase text-center">Instagram</div>
          <div className="text-xs font-bold text-muted-foreground uppercase text-center">TikTok</div>
          <div className="text-xs font-bold text-muted-foreground uppercase text-center">Ação</div>
        </div>

        {/* Day rows */}
        {WEEKLY_CALENDAR.map((slot, i) => {
          const igPilar = getPilar(slot.instagram.pilar);
          const tkPilar = getPilar(slot.tiktok.pilar);
          const IgIcon = slot.instagram.icon;
          const TkIcon = slot.tiktok.icon;
          const isDone = generatedDays.has(slot.dayShort);

          return (
            <div key={slot.dayShort} className={cn(
              'grid grid-cols-[120px_1fr_1fr_80px] gap-2 items-center rounded-xl border border-border bg-card p-3 transition-all',
              isDone && 'border-primary/30 bg-primary/5'
            )}>
              {/* Day label */}
              <div>
                <p className="text-sm font-bold text-foreground">{slot.dayShort}</p>
                <p className="text-[10px] text-muted-foreground">{slot.day}</p>
              </div>

              {/* Instagram */}
              <div className={cn('rounded-lg border p-2.5 flex items-center gap-2', igPilar.border, 'bg-muted/20')}>
                <IgIcon className={cn('h-4 w-4 shrink-0', igPilar.text)} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{slot.instagram.format}</p>
                  <Badge variant="outline" className={cn('text-[9px] h-4 px-1', igPilar.text, igPilar.border)}>
                    {igPilar.label}
                  </Badge>
                </div>
              </div>

              {/* TikTok */}
              <div className={cn('rounded-lg border p-2.5 flex items-center gap-2', tkPilar.border, 'bg-muted/20')}>
                <TkIcon className={cn('h-4 w-4 shrink-0', tkPilar.text)} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{slot.tiktok.format}</p>
                  <Badge variant="outline" className={cn('text-[9px] h-4 px-1', tkPilar.text, tkPilar.border)}>
                    {tkPilar.label}
                  </Badge>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-center">
                {isDone ? (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generateTasksForDay(i)}
                    disabled={generating}
                    className="h-8 w-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-bold text-primary mb-1">📋 Como funciona</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cada botão <strong className="text-foreground">+</strong> cria 2 tarefas no Kanban (1 para Instagram, 1 para TikTok) 
          com o formato, pilar e deadline já configurados. Use <strong className="text-foreground">"Gerar Semana Completa"</strong> para 
          criar as 14 tarefas da semana de uma vez. As tarefas aparecem automaticamente no Kanban com canal, formato em pixels (1080×1920) 
          e o pilar de conteúdo do playbook.
        </p>
      </div>
    </div>
  );
}
