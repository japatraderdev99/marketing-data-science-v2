import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Sparkles, Loader2, Send, Image, Film, Type, Layout, Layers,
  ThumbsUp, ThumbsDown, RefreshCw, Trash2,
  Upload, FileText, Globe, X, Paperclip, Monitor, ExternalLink, Palette
} from 'lucide-react';

interface ChannelFormat {
  channel: string;
  format_label: string;
  width: number;
  height: number;
  ratio: string;
  adapted_copy: string;
}

interface CreativeSuggestion {
  id: string;
  input_text: string;
  input_type: string;
  suggestion_type: string;
  title: string;
  description: string | null;
  copy_text: string | null;
  visual_direction: string | null;
  channel: string | null;
  format: string | null;
  status: string;
  ai_reasoning: string | null;
  created_at: string;
  metadata?: { channel_formats?: ChannelFormat[] } | null;
}

interface AttachedFile {
  name: string;
  type: 'image' | 'pdf' | 'html' | 'text';
  mime: string;
  data: string;
  size: number;
  extracted_text?: string;
  page_images?: string[];
}

const TYPE_CONFIG: Record<string, { icon: typeof Image; label: string; color: string }> = {
  post: { icon: Image, label: 'Post Estático', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  carousel: { icon: Layout, label: 'Carrossel', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  video: { icon: Film, label: 'Vídeo', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  copy: { icon: Type, label: 'Copy', color: 'bg-primary/15 text-primary border-primary/30' },
  reels: { icon: Film, label: 'Reels', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprovada', color: 'bg-green-500/20 text-green-400' },
  rejected: { label: 'Descartada', color: 'bg-red-500/20 text-red-400' },
  sent_to_production: { label: 'Em Produção', color: 'bg-primary/20 text-primary' },
};

const FILE_ICON_MAP: Record<string, typeof FileText> = {
  image: Image,
  pdf: FileText,
  html: Globe,
  text: Type,
};

const CHANNEL_ICONS: Record<string, string> = {
  'Instagram': '📸',
  'Facebook': '📘',
  'TikTok': '🎵',
  'LinkedIn': '💼',
  'YouTube': '▶️',
  'Google Display': '🖥️',
  'Pinterest': '📌',
  'X': '𝕏',
};

// ─── Production Panel (channel/format selector) ─────────────────────────────

function ProductionPanel({
  item,
  onSelectFormat,
}: {
  item: CreativeSuggestion;
  onSelectFormat: (item: CreativeSuggestion, format: ChannelFormat, tool: string) => void;
}) {
  const formats: ChannelFormat[] = (item.metadata as any)?.channel_formats || [];
  
  if (formats.length === 0) {
    // Fallback: show basic routing without format details
    return (
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 animate-fade-in">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
          <Monitor className="h-3 w-3 inline mr-1" /> Selecione a ferramenta
        </p>
        <div className="flex gap-2">
          {item.suggestion_type === 'carousel' && (
            <Button size="sm" className="h-7 px-3 text-xs" onClick={() => onSelectFormat(item, { channel: item.channel || 'Instagram', format_label: 'Carrossel', width: 1080, height: 1350, ratio: '4:5', adapted_copy: item.copy_text || '' }, 'carousel')}>
              <Layers className="h-3 w-3 mr-1" /> Carrossel
            </Button>
          )}
          {(item.suggestion_type === 'post' || item.suggestion_type === 'carousel') && (
            <Button size="sm" className="h-7 px-3 text-xs" onClick={() => onSelectFormat(item, { channel: item.channel || 'Instagram', format_label: 'Post', width: 1080, height: 1350, ratio: '4:5', adapted_copy: item.copy_text || '' }, 'criativo')}>
              <Palette className="h-3 w-3 mr-1" /> Criativo
            </Button>
          )}
          {(item.suggestion_type === 'video' || item.suggestion_type === 'reels') && (
            <Button size="sm" className="h-7 px-3 text-xs" onClick={() => onSelectFormat(item, { channel: item.channel || 'Instagram', format_label: 'Vídeo', width: 1080, height: 1920, ratio: '9:16', adapted_copy: item.copy_text || '' }, 'video')}>
              <Film className="h-3 w-3 mr-1" /> Vídeo IA
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 animate-fade-in">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
        <Monitor className="h-3 w-3 inline mr-1" /> Formatos por Canal
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {formats.map((fmt, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 hover:border-primary/40 transition-all group">
            <span className="text-sm shrink-0">{CHANNEL_ICONS[fmt.channel] || '📱'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">{fmt.channel}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{fmt.format_label}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">{fmt.width}×{fmt.height}</span>
                <span className="text-[10px] text-muted-foreground">{fmt.ratio}</span>
              </div>
              {fmt.adapted_copy && (
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">"{fmt.adapted_copy}"</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" 
                onClick={() => onSelectFormat(item, fmt, 'criativo')}>
                <Palette className="h-3 w-3 mr-0.5" /> Arte
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                onClick={() => onSelectFormat(item, fmt, 'carousel')}>
                <Layers className="h-3 w-3 mr-0.5" /> Carrossel
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Also show video option if type is video/reels */}
      {(item.suggestion_type === 'video' || item.suggestion_type === 'reels') && (
        <Button size="sm" className="h-7 px-3 text-xs mt-2 w-full" onClick={() => onSelectFormat(item, { channel: item.channel || 'Instagram', format_label: 'Vídeo', width: 1080, height: 1920, ratio: '9:16', adapted_copy: item.copy_text || '' }, 'video')}>
          <Film className="h-3 w-3 mr-1" /> Criar Roteiro de Vídeo
        </Button>
      )}
    </div>
  );
}

// ─── SuggestionCard ──────────────────────────────────────────────────────────

function SuggestionCard({
  item, onApprove, onReject, onSelectFormat, onDelete,
}: {
  item: CreativeSuggestion;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSelectFormat: (item: CreativeSuggestion, format: ChannelFormat, tool: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showFormats, setShowFormats] = useState(false);
  const typeConfig = TYPE_CONFIG[item.suggestion_type] || TYPE_CONFIG.post;
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const Icon = typeConfig.icon;

  return (
    <Card className="border-border bg-card hover:border-primary/30 transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground truncate">{item.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusConfig.color)}>
              {statusConfig.label}
            </span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', typeConfig.color)}>
            {typeConfig.label}
          </span>
          {item.channel && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{item.channel}</span>
          )}
          {item.format && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{item.format}</span>
          )}
          {/* Show format count badge */}
          {(item.metadata as any)?.channel_formats?.length > 0 && (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
              {(item.metadata as any).channel_formats.length} canais
            </span>
          )}
        </div>

        {item.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{item.description}</p>}

        {item.copy_text && (
          <div className="rounded-lg bg-muted/30 p-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Copy</p>
            <p className="text-xs text-foreground line-clamp-4 whitespace-pre-wrap">{item.copy_text}</p>
          </div>
        )}

        {item.visual_direction && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 mb-2">
            <p className="text-[10px] font-bold text-primary mb-1">Direção Visual</p>
            <p className="text-xs text-foreground">{item.visual_direction}</p>
          </div>
        )}

        {item.ai_reasoning && (
          <p className="text-[10px] text-muted-foreground italic mb-3">💡 {item.ai_reasoning}</p>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          {item.status === 'pending' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                onClick={() => onApprove(item.id)}>
                <ThumbsUp className="h-3 w-3 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => onReject(item.id)}>
                <ThumbsDown className="h-3 w-3 mr-1" /> Descartar
              </Button>
            </>
          )}
          {item.status === 'approved' && (
            <Button size="sm" className="h-7 px-3 text-xs bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
              onClick={() => setShowFormats(f => !f)}>
              <Send className="h-3 w-3 mr-1" /> {showFormats ? 'Fechar' : 'Produzir'}
            </Button>
          )}
          {item.status === 'sent_to_production' && (
            <Button size="sm" className="h-7 px-3 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
              onClick={() => setShowFormats(f => !f)}>
              <ExternalLink className="h-3 w-3 mr-1" /> Abrir Ferramenta
            </Button>
          )}
          {item.status === 'rejected' && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => onApprove(item.id)}>
              <RefreshCw className="h-3 w-3 mr-1" /> Reaprovar
            </Button>
          )}
        </div>

        {/* Production panel with channel/format selection */}
        {showFormats && (item.status === 'approved' || item.status === 'sent_to_production') && (
          <ProductionPanel item={item} onSelectFormat={onSelectFormat} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── File Helpers ─────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function getFileCategory(file: File): 'image' | 'pdf' | 'html' | 'text' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) return 'html';
  return 'text';
}

const ACCEPTED_TYPES = 'image/*,.pdf,.html,.htm,.txt,.md,.csv,.json';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IdeacaoTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState('');
  const [inputType, setInputType] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CreativeSuggestion[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSuggestions();
  }, [user]);

  const loadSuggestions = async () => {
    const { data, error } = await supabase
      .from('creative_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSuggestions(data as CreativeSuggestion[]);
    if (error) console.error('Error loading suggestions:', error);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const maxSize = 10 * 1024 * 1024;
    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 10MB`, variant: 'destructive' });
        continue;
      }
      const category = getFileCategory(file);
      if (category === 'image') {
        const base64 = await fileToBase64(file);
        newFiles.push({ name: file.name, type: 'image', mime: file.type, data: base64, size: file.size });
      } else if (category === 'pdf') {
        const base64 = await fileToBase64(file);
        newFiles.push({ name: file.name, type: 'pdf', mime: file.type, data: base64, size: file.size });
      } else {
        const text = await fileToText(file);
        newFiles.push({ name: file.name, type: category, mime: file.type, data: text, size: file.size });
      }
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
      setUrls(prev => [...prev, trimmed]);
      setUrlInput('');
    } catch {
      toast({ title: 'URL inválida', description: 'Insira uma URL válida (ex: https://...)', variant: 'destructive' });
    }
  };

  const removeUrl = (index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0 || urls.length > 0;

  const handleAnalyze = async () => {
    if (!hasContent || !user) return;
    setLoading(true);
    try {
      const payload: any = {
        input_text: inputText,
        input_type: inputType,
        user_id: user.id,
        files: attachedFiles.map(f => ({
          name: f.name, type: f.type, mime: f.mime, data: f.data,
          extracted_text: f.extracted_text, page_images: f.page_images,
        })),
        urls,
      };
      const { data, error } = await supabase.functions.invoke('analyze-creative-input', { body: payload });
      if (error) throw error;
      if (data?.suggestions) {
        setSuggestions(prev => [...data.suggestions, ...prev]);
        setInputText('');
        setAttachedFiles([]);
        setUrls([]);
        toast({ title: `${data.suggestions.length} sugestões geradas!`, description: 'Revise e aprove as que mais interessam.' });
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Tente novamente.';
      toast({ title: 'Erro na análise', description: msg.includes('429') ? 'Rate limit. Aguarde.' : msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('creative_suggestions').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('creative_suggestions').delete().eq('id', id);
    if (!error) setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleSelectFormat = async (item: CreativeSuggestion, format: ChannelFormat, tool: string) => {
    // Update status to sent_to_production
    if (item.status !== 'sent_to_production') {
      await handleUpdateStatus(item.id, 'sent_to_production');
    }

    // Save briefing metadata
    const briefingData = {
      channel_formats: (item.metadata as any)?.channel_formats || [],
      selected_format: format,
      selected_tool: tool,
    };
    await supabase.from('creative_suggestions').update({
      metadata: briefingData as any,
    }).eq('id', item.id);

    // Build briefing context
    const briefing = [
      item.title,
      item.description,
      format.adapted_copy ? `Copy adaptada: ${format.adapted_copy}` : (item.copy_text ? `Copy: ${item.copy_text}` : ''),
      item.visual_direction ? `Direção visual: ${item.visual_direction}` : '',
      `Canal: ${format.channel}`,
      `Formato: ${format.format_label} (${format.width}×${format.height}, ${format.ratio})`,
    ].filter(Boolean).join('\n\n');

    // Route to the correct tool
    if (tool === 'carousel') {
      localStorage.setItem('ideacao_to_carousel', JSON.stringify({
        context: briefing,
        channel: format.channel,
        suggestionId: item.id,
        format: { width: format.width, height: format.height, ratio: format.ratio },
      }));
      toast({ title: 'Enviado para Carrosséis!', description: `${format.channel} · ${format.format_label}` });
      navigate('/ai-carrosseis');
    } else if (tool === 'video') {
      localStorage.setItem('ideacao_to_video', JSON.stringify({
        context: briefing,
        channel: format.channel,
        suggestionId: item.id,
      }));
      toast({ title: 'Enviado para Vídeo IA!', description: `${format.channel} · Roteiro` });
      navigate('/video-ia');
    } else {
      // Criativo - static art
      localStorage.setItem('ideacao_to_criativo', JSON.stringify({
        context: briefing,
        channel: format.channel,
        suggestionId: item.id,
        format: { width: format.width, height: format.height, ratio: format.ratio, label: format.format_label },
        copy_text: format.adapted_copy || item.copy_text,
        visual_direction: item.visual_direction,
        title: item.title,
      }));
      toast({ title: 'Enviado para AI Criativo!', description: `${format.channel} · ${format.format_label} (${format.width}×${format.height})` });
      navigate('/criativo');
    }
  };

  const filtered = suggestions.filter(s => filterStatus === 'all' || s.status === filterStatus);
  const counts = {
    all: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    approved: suggestions.filter(s => s.status === 'approved').length,
    sent_to_production: suggestions.filter(s => s.status === 'sent_to_production').length,
  };

  return (
    <div className="space-y-4">
      {/* Input area */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Input Criativo</h3>
            <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">Claude Sonnet 4</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole textos, anexe imagens/PDFs/HTMLs ou adicione URLs. A IA analisa tudo e gera sugestões com formatos por canal.
          </p>

          <Textarea
            placeholder="Cole referências, ideias, prompts, copies, conceitos visuais...&#10;&#10;Exemplo: 'Quero um post mostrando os 5 maiores erros de eletricistas ao precificar'"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="min-h-[100px] bg-background border-border text-sm"
          />

          {/* File attachments display */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, i) => {
                const FileIcon = FILE_ICON_MAP[file.type] || FileText;
                return (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate max-w-[150px]">{file.name}</span>
                    <span className="text-muted-foreground text-[10px]">({(file.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => removeFile(i)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* URL list */}
          {urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {urls.map((url, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground truncate max-w-[200px]">{url}</span>
                  <button onClick={() => removeUrl(i)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* URL input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Adicionar URL de referência..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                className="h-8 pl-8 text-xs bg-background border-border"
              />
            </div>
            <Button variant="outline" size="sm" onClick={addUrl} disabled={!urlInput.trim()} className="h-8 px-3 text-xs">
              Adicionar
            </Button>
          </div>

          {/* Bottom actions bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={handleFileSelect} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 px-3 text-xs border-border">
              <Paperclip className="h-3 w-3 mr-1.5" /> Anexar Arquivo
            </Button>

            <Select value={inputType} onValueChange={setInputType}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Misto / Geral</SelectItem>
                <SelectItem value="static">Estático (Posts)</SelectItem>
                <SelectItem value="video">Vídeo / Reels</SelectItem>
                <SelectItem value="copy">Copies / Textos</SelectItem>
                <SelectItem value="prompt">Prompts de IA</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAnalyze} disabled={loading || !hasContent} className="h-8 px-4 text-xs ml-auto">
              {loading ? (
                <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Analisando...</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1.5" /> Analisar com IA</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      {suggestions.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'all', label: `Todas (${counts.all})` },
            { key: 'pending', label: `Pendentes (${counts.pending})` },
            { key: 'approved', label: `Aprovadas (${counts.approved})` },
            { key: 'sent_to_production', label: `Produção (${counts.sent_to_production})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                filterStatus === f.key
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <SuggestionCard
              key={item.id}
              item={item}
              onApprove={id => handleUpdateStatus(id, 'approved')}
              onReject={id => handleUpdateStatus(id, 'rejected')}
              onSelectFormat={handleSelectFormat}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhuma sugestão com esse filtro.</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Insira materiais criativos acima para gerar sugestões com IA.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Suporta texto, imagens, PDFs, HTML e URLs</p>
        </div>
      )}
    </div>
  );
}
