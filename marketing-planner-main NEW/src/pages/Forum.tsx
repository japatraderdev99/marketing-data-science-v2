import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Send, Pin, Bot, MessageSquare, Target, BarChart2, Zap,
  CheckSquare, ChevronDown, Loader2, AtSign, CornerDownLeft,
  Sparkles, Lock, Unlock, Hash, Users,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ForumMessage {
  id: string;
  user_id: string;
  author_name: string;
  author_initials: string;
  author_role: string;
  content: string;
  is_ai: boolean;
  is_pinned: boolean;
  message_type: string;
  metadata: Record<string, string> | null;
  reply_to: string | null;
  created_at: string;
}

// ─── Team config ────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { id: 'gabriel', name: 'Gabriel', role: 'CMO · Head de Comunicação', initials: 'GA', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/40' },
  { id: 'guilherme', name: 'Guilherme', role: 'Diretor Criativo', initials: 'GU', color: 'bg-primary', text: 'text-primary', border: 'border-primary/40' },
  { id: 'marcelo', name: 'Marcelo', role: 'CFO', initials: 'MC', color: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-600/40' },
  { id: 'leandro', name: 'Leandro', role: 'CEO', initials: 'LE', color: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-600/40' },
  { id: 'gustavo', name: 'Gustavo', role: 'Dev', initials: 'GV', color: 'bg-rose-600', text: 'text-rose-400', border: 'border-rose-600/40' },
];

const QUICK_COMMANDS = [
  { label: 'Status campanha', cmd: '@DQEF qual o status atual das campanhas de lançamento?', icon: BarChart2 },
  { label: 'Prioridades', cmd: '@DQEF quais são as prioridades mais urgentes para o time agora?', icon: Zap },
  { label: 'Estratégia prestadores', cmd: '@DQEF analise a estratégia de engajamento de prestadores e sugira melhorias', icon: Target },
  { label: 'Aprovar criativo', cmd: '@DQEF registre a aprovação dos criativos da campanha de awareness pelo Gabriel', icon: CheckSquare },
];

const MSG_TYPE_STYLES: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  message: { label: 'Mensagem', icon: MessageSquare, color: 'text-muted-foreground', bg: '' },
  task_comment: { label: 'Comentário de Task', icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/8 border border-blue-500/20' },
  strategy_change: { label: 'Mudança de Estratégia', icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/8 border border-amber-500/20' },
  goal_update: { label: 'Atualização de Meta', icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-500/8 border border-emerald-500/20' },
  system: { label: 'Sistema', icon: Bot, color: 'text-primary', bg: 'bg-primary/8 border border-primary/20' },
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ initials, colorClass, isAI }: { initials: string; colorClass: string; isAI?: boolean }) {
  if (isAI) {
    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
    );
  }
  return (
    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white', colorClass)}>
      {initials}
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onPin,
  currentUserId,
}: {
  msg: ForumMessage;
  onPin: (id: string, pinned: boolean) => void;
  currentUserId: string;
}) {
  const isOwn = msg.user_id === currentUserId;
  const member = TEAM_MEMBERS.find(m => m.initials === msg.author_initials);
  const typeStyle = MSG_TYPE_STYLES[msg.message_type] || MSG_TYPE_STYLES.message;
  const TypeIcon = typeStyle.icon;

  // Format AI content: replace [AÇÃO:...] with styled badge
  const formattedContent = msg.is_ai
    ? msg.content.replace(/\[AÇÃO:[^\]]+\]/gi, (match) => `\n\n💡 _${match}_`)
    : msg.content;

  return (
    <div className={cn('group flex gap-3 px-4 py-2 hover:bg-muted/30 transition-colors', msg.is_pinned && 'bg-primary/5 border-l-2 border-primary')}>
      {/* Avatar */}
      <div className="pt-0.5">
        <Avatar
          initials={msg.author_initials}
          colorClass={member?.color || 'bg-muted-foreground'}
          isAI={msg.is_ai}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn('text-sm font-semibold', msg.is_ai ? 'text-primary' : (member?.text || 'text-foreground'))}>
            {msg.author_name}
          </span>
          <span className="text-xs text-muted-foreground">{msg.author_role}</span>
          {msg.message_type !== 'message' && (
            <Badge variant="outline" className={cn('text-xs h-4 px-1.5 gap-1', typeStyle.color, 'border-current/30')}>
              <TypeIcon className="h-2.5 w-2.5" />
              {typeStyle.label}
            </Badge>
          )}
          {msg.is_pinned && (
            <Badge variant="outline" className="text-xs h-4 px-1.5 gap-1 text-primary border-primary/30">
              <Pin className="h-2.5 w-2.5" />
              Fixada
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Message body */}
        <div className={cn('rounded-lg px-3 py-2 text-sm leading-relaxed', typeStyle.bg || 'bg-muted/40')}>
          {formattedContent.split('\n').map((line, i) => (
            <p key={i} className={cn('', line.startsWith('💡') && 'text-primary/80 text-xs mt-1 italic')}>
              {line || <br />}
            </p>
          ))}
        </div>

        {/* Metadata for actions */}
        {msg.metadata && msg.message_type !== 'message' && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span>{msg.metadata.taskTitle || msg.metadata.detail}</span>
          </div>
        )}

        {/* Actions on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex gap-1">
          <button
            onClick={() => onPin(msg.id, !msg.is_pinned)}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-muted transition-colors',
              msg.is_pinned ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {msg.is_pinned ? <Unlock className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {msg.is_pinned ? 'Desafixar' : 'Fixar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Forum() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'ai'>('all');
  const [aiAuthorized, setAiAuthorized] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resolve current user display info
  const currentProfile = TEAM_MEMBERS.find(m =>
    user?.email?.toLowerCase().includes(m.name.toLowerCase())
  ) || TEAM_MEMBERS[0];

  // ── Load messages ──
  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('forum_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      toast.error('Erro ao carregar mensagens');
      return;
    }
    setMessages((data as ForumMessage[]) || []);
  }, []);

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel('forum-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => {
              const exists = prev.find(m => m.id === (payload.new as ForumMessage).id);
              if (exists) return prev;
              return [...prev, payload.new as ForumMessage];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev =>
              prev.map(m => m.id === (payload.new as ForumMessage).id ? (payload.new as ForumMessage) : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadMessages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──
  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    const isAICommand = input.toLowerCase().includes('@dqef');

    const msgPayload = {
      user_id: user.id,
      author_name: currentProfile.name,
      author_initials: currentProfile.initials,
      author_role: currentProfile.role,
      content: input.trim(),
      is_ai: false,
      is_pinned: false,
      message_type: 'message',
    };

    setLoading(true);
    const msgText = input.trim();
    setInput('');

    // Save user message
    const { error } = await supabase.from('forum_messages').insert(msgPayload);
    if (error) {
      toast.error('Erro ao enviar mensagem');
      setLoading(false);
      return;
    }
    setLoading(false);

    // Trigger AI if command and authorized
    if (isAICommand && aiAuthorized) {
      setAiLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('forum-ai', {
          body: {
            message: msgText,
            conversationHistory: messages.slice(-10),
            authorName: currentProfile.name,
            authorRole: currentProfile.role,
          },
        });

        if (fnError) throw fnError;
        if (data?.error) {
          toast.error(data.error);
        }
      } catch (err) {
        console.error('AI error:', err);
        toast.error('Erro ao chamar a IA. Tente novamente.');
      } finally {
        setAiLoading(false);
      }
    }
  };

  // ── Pin message ──
  const handlePin = async (id: string, pinned: boolean) => {
    const { error } = await supabase
      .from('forum_messages')
      .update({ is_pinned: pinned })
      .eq('id', id);

    if (error) toast.error('Erro ao fixar mensagem');
    else toast.success(pinned ? 'Mensagem fixada' : 'Mensagem desafixada');
  };

  // ── Handle key ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Filtered messages ──
  const filtered = messages.filter(m => {
    if (activeTab === 'pinned') return m.is_pinned;
    if (activeTab === 'ai') return m.is_ai;
    return true;
  });

  const pinnedCount = messages.filter(m => m.is_pinned).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/25">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Fórum da Equipe</h1>
            <p className="text-xs text-muted-foreground">Chat, decisões e comandos de IA em tempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI toggle */}
          <button
            onClick={() => setAiAuthorized(v => !v)}
            className={cn(
              'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all',
              aiAuthorized
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-muted/40 border-border text-muted-foreground'
            )}
          >
            {aiAuthorized ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>IA {aiAuthorized ? 'Autorizada' : 'Bloqueada'}</span>
            <Bot className="h-3.5 w-3.5" />
          </button>

          {/* Online members */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{TEAM_MEMBERS.length} membros</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-6 pt-3 border-b border-border bg-card/30">
        {[
          { key: 'all', label: 'Todas', count: messages.length },
          { key: 'pinned', label: 'Fixadas', count: pinnedCount },
          { key: 'ai', label: 'IA', count: messages.filter(m => m.is_ai).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-all border-b-2',
              activeTab === tab.key
                ? 'text-primary border-primary font-medium'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {tab.key === 'pinned' && <Pin className="h-3 w-3" />}
            {tab.key === 'ai' && <Sparkles className="h-3 w-3" />}
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-xs rounded-full px-1.5 min-w-[1.25rem] text-center',
                activeTab === tab.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              {activeTab === 'pinned' ? 'Nenhuma mensagem fixada' :
               activeTab === 'ai' ? 'Nenhuma resposta da IA ainda' :
               'Seja o primeiro a enviar uma mensagem'}
            </p>
          </div>
        ) : (
          <>
            {filtered.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onPin={handlePin}
                currentUserId={user?.id || ''}
              />
            ))}
          </>
        )}

        {/* AI loading indicator */}
        {aiLoading && (
          <div className="flex gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              DQEF Assistant está pensando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick commands ── */}
      {aiAuthorized && (
        <div className="px-4 py-2 border-t border-border/50 bg-card/30">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Bot className="h-3 w-3" /> Comandos rápidos:
            </span>
            {QUICK_COMMANDS.map(qc => {
              const Icon = qc.icon;
              return (
                <button
                  key={qc.label}
                  onClick={() => { setInput(qc.cmd); textareaRef.current?.focus(); }}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors shrink-0"
                >
                  <Icon className="h-3 w-3" />
                  {qc.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-4 py-3 border-t border-border bg-card/50">
        <div className="flex gap-2 items-end">
          <Avatar
            initials={currentProfile.initials}
            colorClass={currentProfile.color}
          />
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiAuthorized
                ? 'Mensagem ou @DQEF [comando] para acionar a IA...'
                : 'Envie uma mensagem para o time...'}
              className="min-h-[44px] max-h-32 resize-none pr-10 text-sm bg-muted/40 border-border focus:border-primary/50"
              rows={1}
            />
            {input.toLowerCase().includes('@dqef') && aiAuthorized && (
              <div className="absolute top-1 right-2">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
            )}
          </div>
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 ml-10">
          <CornerDownLeft className="h-3 w-3 inline mr-1" />
          Enter para enviar · Shift+Enter para nova linha
          {aiAuthorized && <> · <AtSign className="h-3 w-3 inline mx-0.5" />DQEF para acionar a IA</>}
        </p>
      </div>
    </div>
  );
}
