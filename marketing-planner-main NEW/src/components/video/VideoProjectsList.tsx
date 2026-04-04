import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Film, Trash2, Loader2, FolderOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface VideoProject {
  id: string;
  title: string;
  concept: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  storyboard: unknown[];
}

interface Props {
  userId: string | null;
  onLoadProject: (project: VideoProject) => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'border-muted-foreground/30 text-muted-foreground' },
  in_production: { label: 'Em Produção', className: 'border-primary/30 text-primary' },
  done: { label: 'Concluído', className: 'border-green-500/30 text-green-400' },
};

export default function VideoProjectsList({ userId, onLoadProject }: Props) {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const dbFrom = (table: string) => (supabase as any).from(table);

  const fetchProjects = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await dbFrom('video_projects')
      .select('id, title, concept, status, created_at, updated_at, storyboard')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    setProjects((data || []) as VideoProject[]);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [userId]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await dbFrom('video_projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">Carregando projetos...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-bold text-foreground">Nenhum projeto de vídeo</p>
        <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro projeto na aba "Projeto de Vídeo"</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map(project => {
        const sb = STATUS_BADGE[project.status] || STATUS_BADGE.draft;
        const shotCount = Array.isArray(project.storyboard) ? project.storyboard.length : 0;
        return (
          <div key={project.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Film className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-bold text-foreground truncate">{project.title}</p>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', sb.className)}>{sb.label}</Badge>
                </div>
                {project.concept && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 ml-6">{project.concept}</p>
                )}
                <div className="flex items-center gap-3 mt-2 ml-6">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(project.updated_at), 'dd/MM/yy HH:mm')}
                  </span>
                  {shotCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{shotCount} shot{shotCount > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onLoadProject(project)}>
                  Abrir
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="text-xs h-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(project.id)}
                  disabled={deleting === project.id}
                >
                  {deleting === project.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
