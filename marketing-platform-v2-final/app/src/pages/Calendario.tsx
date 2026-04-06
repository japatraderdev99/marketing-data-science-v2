import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreativeDrafts, TYPE_LABELS, type CreativeDraft } from '@/features/campaigns/hooks/useCreativeDrafts';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-text-muted',
  approved: 'bg-green-400',
  published: 'bg-brand',
  archived: 'bg-text-muted/40',
};

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  // Pad to complete last week
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function draftsByDay(drafts: CreativeDraft[], year: number, month: number) {
  const map: Record<number, CreativeDraft[]> = {};
  drafts.forEach(d => {
    const date = new Date(d.updated_at);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(d);
    }
  });
  return map;
}

export default function Calendario() {
  const { data: drafts = [] } = useCreativeDrafts();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(null);

  const days = buildCalendarDays(year, month);
  const byDay = draftsByDay(drafts, year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const selectedDrafts = selected ? (byDay[selected] ?? []) : [];

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarDays className="w-5 h-5 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Calendário</h1>
          <p className="text-sm text-text-secondary">Criativos por data de atualização</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Calendar */}
        <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
          {/* Nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-heading font-bold text-sm text-text-primary capitalize">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(w => (
              <div key={w} className="py-2 text-center text-[10px] font-bold text-text-muted uppercase tracking-wide">
                {w}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const hasDrafts = day ? (byDay[day]?.length ?? 0) > 0 : false;
              const isSelected = day === selected;

              return (
                <div
                  key={i}
                  onClick={() => day && setSelected(isSelected ? null : day)}
                  className={cn(
                    'min-h-[72px] p-2 border-b border-r border-border/50 transition-colors',
                    day ? 'cursor-pointer hover:bg-surface-hover' : '',
                    isSelected ? 'bg-brand/10' : '',
                  )}
                >
                  {day && (
                    <>
                      <span className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'gradient-brand text-white' : 'text-text-secondary'
                      )}>
                        {day}
                      </span>
                      {hasDrafts && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {(byDay[day] ?? []).slice(0, 3).map(d => (
                            <span key={d.id} className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[d.status])} />
                          ))}
                          {(byDay[day]?.length ?? 0) > 3 && (
                            <span className="text-[9px] text-text-muted">+{(byDay[day]?.length ?? 0) - 3}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar — day detail */}
        <div className="bg-surface-elevated border border-border rounded-xl p-4">
          {!selected && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2">
              <CalendarDays className="w-8 h-8 text-text-muted opacity-30" />
              <p className="text-xs text-text-muted text-center">Clique em um dia para ver os criativos</p>
            </div>
          )}

          {selected && (
            <>
              <p className="font-heading font-bold text-sm text-text-primary mb-3">
                {new Date(year, month, selected).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {selectedDrafts.length === 0 && (
                <p className="text-xs text-text-muted">Nenhum criativo neste dia.</p>
              )}
              <div className="space-y-2">
                {selectedDrafts.map(d => (
                  <div key={d.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors border border-border">
                    <span className={cn('w-2 h-2 rounded-full mt-0.5 shrink-0', STATUS_DOT[d.status])} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{d.title || 'Sem título'}</p>
                      <p className="text-[10px] text-text-muted">{TYPE_LABELS[d.type] ?? d.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
