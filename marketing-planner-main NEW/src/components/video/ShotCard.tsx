import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Copy, Check, Camera, Film, Clock, Loader2,
  ChevronDown, ChevronUp, Sparkles, CheckCircle2
} from 'lucide-react';

export interface Shot {
  id: number;
  title: string;
  duration: string;
  description: string;
  type: string; // setup | conflict | resolution | hero | cta
  recommendedModel: string;
  framePrompt?: string;
  framePromptPtBr?: string;
  motionPrompt?: string;
  motionPromptPtBr?: string;
  frameApproved?: boolean;
  motionReady?: boolean;
}

interface Props {
  shot: Shot;
  showFramePrompt?: boolean;
  showMotionPrompt?: boolean;
  onGenerateFrame?: (shotId: number) => void;
  onGenerateMotion?: (shotId: number) => void;
  onApproveFrame?: (shotId: number) => void;
  loadingFrame?: boolean;
  loadingMotion?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  setup: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  conflict: 'border-red-500/30 bg-red-500/10 text-red-400',
  resolution: 'border-green-500/30 bg-green-500/10 text-green-400',
  hero: 'border-primary/30 bg-primary/10 text-primary',
  cta: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={cn(
        'flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all',
        copied ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

export default function ShotCard({
  shot, showFramePrompt, showMotionPrompt,
  onGenerateFrame, onGenerateMotion, onApproveFrame,
  loadingFrame, loadingMotion
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const typeStyle = TYPE_COLORS[shot.type] || TYPE_COLORS.setup;

  return (
    <div className={cn('rounded-xl border bg-card transition-all', shot.frameApproved ? 'border-green-500/30' : 'border-border')}>
      {/* Header */}
      <button onClick={() => setExpanded(o => !o)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors rounded-t-xl">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black', typeStyle)}>
          {shot.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-foreground truncate">{shot.title}</p>
            <Badge variant="outline" className={cn('text-[9px] shrink-0', typeStyle)}>{shot.type}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {shot.duration}
            </span>
            <span className="text-[10px] text-muted-foreground">{shot.recommendedModel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {shot.frameApproved && <CheckCircle2 className="h-4 w-4 text-green-400" />}
          {shot.motionReady && <Film className="h-4 w-4 text-primary" />}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3">
          <p className="text-[11px] text-foreground leading-relaxed">{shot.description}</p>

          {/* Frame Prompt */}
          {showFramePrompt && (
            <div className="space-y-2">
              {shot.framePrompt ? (
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Camera className="h-3 w-3" /> Frame Prompt (EN)
                    </span>
                    <CopyBtn text={shot.framePrompt} />
                  </div>
                  <p className="text-[11px] font-mono text-foreground leading-relaxed">{shot.framePrompt}</p>
                  {shot.framePromptPtBr && (
                    <div className="mt-2 rounded-lg border border-primary/10 bg-primary/5 p-2">
                      <p className="text-[10px] text-foreground leading-relaxed">{shot.framePromptPtBr}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  size="sm" variant="outline" className="gap-1.5 text-xs w-full"
                  onClick={() => onGenerateFrame?.(shot.id)}
                  disabled={loadingFrame}
                >
                  {loadingFrame ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Gerar Frame Prompt
                </Button>
              )}

              {shot.framePrompt && !shot.frameApproved && (
                <Button
                  size="sm" className="gap-1.5 text-xs w-full"
                  onClick={() => onApproveFrame?.(shot.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar Frame
                </Button>
              )}
            </div>
          )}

          {/* Motion Prompt */}
          {showMotionPrompt && shot.frameApproved && (
            <div className="space-y-2">
              {shot.motionPrompt ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Film className="h-3 w-3" /> Motion Prompt (EN)
                    </span>
                    <CopyBtn text={shot.motionPrompt} />
                  </div>
                  <p className="text-[11px] font-mono text-foreground leading-relaxed">{shot.motionPrompt}</p>
                  {shot.motionPromptPtBr && (
                    <div className="mt-2 rounded-lg bg-muted/30 p-2">
                      <p className="text-[10px] text-foreground leading-relaxed">{shot.motionPromptPtBr}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  size="sm" variant="outline" className="gap-1.5 text-xs w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => onGenerateMotion?.(shot.id)}
                  disabled={loadingMotion}
                >
                  {loadingMotion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
                  Gerar Motion Prompt
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
