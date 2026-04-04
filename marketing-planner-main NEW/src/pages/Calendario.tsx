import { useState, useEffect } from 'react';
import { useCalendarContents } from '@/hooks/useCalendarContents';
import { ContentItem, ContentFormat, Channel } from '@/data/seedData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List, X, Palette, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const FORMAT_COLORS: Record<ContentFormat, string> = {
  Post: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Reels: 'bg-primary/20 text-primary border-primary/30',
  Stories: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Carrossel: 'bg-teal/20 text-teal border-teal/30',
  Ads: 'bg-red-500/20 text-red-400 border-red-500/30',
  Shorts: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  Rascunho: 'bg-muted text-muted-foreground',
  'Em produção': 'bg-primary/20 text-primary',
  Aprovado: 'bg-teal/20 text-teal',
  Publicado: 'bg-green-500/20 text-green-400',
};

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CampaignTaskBrief {
  id: string;
  title: string;
  channel: string;
  creative_type: string;
  deadline: string | null;
  status: string;
  campaign_name: string;
  format_width: number | null;
  format_height: number | null;
}

export default function Calendario() {
  const { contents, setContents } = useCalendarContents();
  const { user } = useAuth();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [campaignTasks, setCampaignTasks] = useState<CampaignTaskBrief[]>([]);

  // Load campaign tasks from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from('campaign_tasks')
        .select('id, title, channel, creative_type, deadline, status, campaign_name, format_width, format_height')
        .eq('user_id', user.id);
      if (data) setCampaignTasks(data);
    })();
  }, [user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const contentByDay: Record<string, ContentItem[]> = {};
  contents.forEach(c => {
    const d = c.date?.split('T')[0];
    if (d) {
      if (!contentByDay[d]) contentByDay[d] = [];
      contentByDay[d].push(c);
    }
  });

  // Group campaign tasks by deadline date
  const tasksByDay: Record<string, CampaignTaskBrief[]> = {};
  campaignTasks.forEach(t => {
    if (t.deadline) {
      const d = t.deadline.split('T')[0];
      if (!tasksByDay[d]) tasksByDay[d] = [];
      tasksByDay[d].push(t);
    }
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDayContents = selectedDay ? (contentByDay[selectedDay] ?? []) : [];
  const selectedDayTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : [];

  const [form, setForm] = useState({ title: '', format: 'Post' as ContentFormat, channel: 'Meta Ads' as Channel, status: 'Rascunho' as ContentItem['status'], responsible: '', copy: '' });

  const handleCreate = () => {
    if (!form.title || !newDate) return;
    const item: ContentItem = {
      id: `cont-${Date.now()}`,
      title: form.title,
      format: form.format,
      channel: form.channel,
      date: newDate,
      status: form.status,
      responsible: form.responsible || 'Time Marketing',
      copy: form.copy,
    };
    setContents(prev => [...prev, item]);
    setShowNewModal(false);
    setForm({ title: '', format: 'Post', channel: 'Meta Ads', status: 'Rascunho', responsible: '', copy: '' });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold text-foreground">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', view === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <LayoutGrid className="h-3.5 w-3.5" /> Calendário
            </button>
            <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <List className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
          <Button size="sm" onClick={() => { setNewDate(`${year}-${String(month + 1).padStart(2, '0')}-01`); setShowNewModal(true); }} className="gradient-orange text-white border-0">
            <Plus className="mr-1.5 h-4 w-4" /> Novo conteúdo
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(FORMAT_COLORS).map(([fmt, cls]) => (
          <span key={fmt} className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', cls)}>{fmt}</span>
        ))}
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary flex items-center gap-1">
          <Palette className="h-2.5 w-2.5" /> Tarefa Criativa
        </span>
      </div>

      {view === 'calendar' ? (
        <div className="flex gap-4">
          {/* Calendar Grid */}
          <Card className="flex-1 border-border bg-card">
            <CardContent className="p-4">
              {/* Week headers */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEK_DAYS.map(d => (
                  <div key={d} className="py-1 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayContents = contentByDay[dateStr] ?? [];
                  const dayTasks = tasksByDay[dateStr] ?? [];
                  const totalItems = dayContents.length + dayTasks.length;
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isSelected = dateStr === selectedDay;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                      className={cn(
                        'relative min-h-[72px] rounded-lg border p-1.5 text-left transition-all duration-200',
                        isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card/50 hover:border-primary/30 hover:bg-muted/30',
                        isToday && 'border-teal/50'
                      )}
                    >
                      <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'gradient-teal text-white' : 'text-foreground')}>
                        {day}
                      </span>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {dayContents.slice(0, 2).map(c => (
                          <span key={c.id} className={cn('truncate rounded px-1 py-0.5 text-[9px] font-medium', FORMAT_COLORS[c.format])}>
                            {c.title.split(' ')[0]}
                          </span>
                        ))}
                        {dayTasks.slice(0, 2).map(t => (
                          <span key={t.id} className="truncate rounded px-1 py-0.5 text-[9px] font-medium bg-primary/15 text-primary border border-primary/20">
                            {t.creative_type === 'video' || t.creative_type === 'reels' ? '🎬' : '🎨'} {t.title.split(' ')[0]}
                          </span>
                        ))}
                        {totalItems > 4 && (
                          <span className="text-[9px] text-muted-foreground">+{totalItems - 4}</span>
                        )}
                      </div>
                      {totalItems === 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setNewDate(dateStr); setShowNewModal(true); }}
                          className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <span className="text-[9px] text-primary">+ add</span>
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Side Panel */}
          {selectedDay && (
            <Card className="w-72 shrink-0 border-border bg-card animate-slide-in">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                  <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedDayContents.length === 0 && selectedDayTasks.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    <p>Nenhum conteúdo</p>
                    <Button size="sm" variant="ghost" className="mt-2 text-primary" onClick={() => { setNewDate(selectedDay); setShowNewModal(true); }}>
                      <Plus className="mr-1 h-3 w-3" /> Criar conteúdo
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Campaign tasks */}
                    {selectedDayTasks.map(t => (
                      <div key={t.id} className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              {t.creative_type === 'video' || t.creative_type === 'reels' || t.creative_type === 'stories'
                                ? <Video className="h-3 w-3 text-primary" />
                                : <Palette className="h-3 w-3 text-primary" />
                              }
                              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Tarefa Criativa</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                            <p className="text-[10px] text-muted-foreground">{t.campaign_name}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded-full bg-primary/15 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">{t.channel}</span>
                          {t.format_width && t.format_height && (
                            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{t.format_width}×{t.format_height}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Content items */}
                    {selectedDayContents.map(c => (
                      <div key={c.id} className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{c.responsible}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', FORMAT_COLORS[c.format])}>{c.format}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[c.status])}>{c.status}</span>
                        </div>
                        {c.copy && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.copy}</p>}
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="w-full text-primary" onClick={() => { setNewDate(selectedDay); setShowNewModal(true); }}>
                      <Plus className="mr-1 h-3 w-3" /> Adicionar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* List View */
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-2">
            {/* Campaign tasks in list view */}
            {campaignTasks
              .filter(t => {
                if (!t.deadline) return false;
                const d = new Date(t.deadline);
                return d.getMonth() === month && d.getFullYear() === year;
              })
              .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
              .map(t => (
                <div key={t.id} className="flex items-center gap-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 hover:border-primary/50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary border border-primary/20">
                    {t.deadline ? new Date(t.deadline + 'T12:00:00').getDate() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">🎯 {t.campaign_name} · {t.channel}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-primary/15 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">{t.creative_type}</span>
                    {t.format_width && t.format_height && (
                      <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{t.format_width}×{t.format_height}</span>
                    )}
                  </div>
                </div>
              ))
            }
            {/* Content items in list view */}
            {contents
              .filter(c => {
                const d = new Date(c.date);
                return d.getMonth() === month && d.getFullYear() === year;
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(c => (
                <div key={c.id} className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-3 hover:border-primary/30 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-sm font-bold text-primary border border-border">
                    {new Date(c.date + 'T12:00:00').getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.responsible} · {c.channel}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', FORMAT_COLORS[c.format])}>{c.format}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[c.status])}>{c.status}</span>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      )}

      {/* New Content Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle>Novo Conteúdo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título*" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-background" />
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-background" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v as ContentFormat }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {['Post', 'Reels', 'Stories', 'Carrossel', 'Ads', 'Shorts'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v as Channel }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {['TikTok', 'Meta Ads', 'LinkedIn', 'YouTube', 'Orgânico', 'Google Ads'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ContentItem['status'] }))}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {['Rascunho', 'Em produção', 'Aprovado', 'Publicado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Responsável" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className="bg-background" />
            <Textarea placeholder="Copy (opcional)" value={form.copy} onChange={e => setForm(f => ({ ...f, copy: e.target.value }))} className="bg-background" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="gradient-orange text-white border-0">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
