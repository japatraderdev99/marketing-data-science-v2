import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initialEstrategias } from '@/data/seedData';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCalendarContents } from '@/hooks/useCalendarContents';
import type { Campaign, ContentItem } from '@/data/seedData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CampaignKnowledgeSelector from '@/components/CampaignKnowledgeSelector';
import StrategyContextPanel from '@/components/video/StrategyContextPanel';
import BenchmarkPanel from '@/components/criativo/BenchmarkPanel';
import DataSciencePanel from '@/components/criativo/DataSciencePanel';
import VariationsGrid, {
  SHAPE_STYLES, type CreativeVariation, type ShapeStyle,
} from '@/components/criativo/VariationsGrid';
import AdjSlider from '@/components/criativo/AdjSlider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sparkles, Zap, DollarSign, Heart, Clock, Smile, Brain,
  Instagram, Youtube, Copy, Check, RefreshCw,
  ChevronDown, ChevronUp, BarChart3, TrendingUp, Users,
  Download, Image as ImageIcon, Upload, Palette, Monitor,
  Layers, Target, FileImage, Wand2, Save, FolderOpen, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import dqfIcon from '@/assets/dqf-icon.svg';
import { CREATIVE_FORMATS, CAROUSEL_THEMES, type CreativeFormat, type CarouselTheme, type CarouselThemeId } from '@/pages/AiCarrosseis';

// ─── Draft Types ──────────────────────────────────────────────────────────────

interface CriativoDraft {
  id: string;
  sigla: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Creative state
  headline: string;
  headlineHighlight: string;
  subtext: string;
  caption: string;
  imageUrl: string | null;
  angle: string;
  channel: string;
  objective: string;
  nichos: string[];
  formatId: string;
  themeId: string;
  shape: ShapeStyle;
  context: string;
  imagePrompt: string;
  variations: CreativeVariation[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANGLES = [
  { id: 'IA-Decide', label: 'IA Decide', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', desc: 'IA analisa a referência e escolhe o melhor ângulo' },
  { id: 'Raiva', label: 'Raiva', icon: Zap, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', desc: 'Expõe injustiças das plataformas' },
  { id: 'Dinheiro', label: 'Dinheiro', icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10 border-primary/30', desc: 'Números que doem e revelam' },
  { id: 'Orgulho', label: 'Orgulho', icon: Heart, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', desc: 'Valoriza o ofício do prestador' },
  { id: 'Urgência', label: 'Urgência', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', desc: 'Janela de oportunidade agora' },
  { id: 'Alívio', label: 'Alívio', icon: Smile, color: 'text-teal', bg: 'bg-teal/10 border-teal/30', desc: 'PIX na hora, controle total' },
];

const CHANNELS = [
  { id: 'Instagram Feed', label: 'Instagram', sub: 'Feed', icon: Instagram },
  { id: 'Instagram Stories', label: 'Instagram', sub: 'Stories', icon: Instagram },
  { id: 'TikTok', label: 'TikTok', sub: '', icon: null },
  { id: 'YouTube', label: 'YouTube', sub: '', icon: Youtube },
  { id: 'LinkedIn', label: 'LinkedIn', sub: '', icon: null },
  { id: 'Facebook', label: 'Facebook', sub: '', icon: null },
  { id: 'Google Display', label: 'Google Ads', sub: '', icon: Monitor },
  { id: 'Pinterest', label: 'Pinterest', sub: '', icon: null },
];

const OBJECTIVES = ['Awareness', 'Engajamento', 'Conversão', 'Retenção'];

const NICHOS = [
  'Piscineiro', 'Eletricista', 'Encanador', 'Marido de Aluguel',
  'Pedreiro', 'Pintor', 'Jardineiro', 'Faxineira', 'Diarista',
  'Técnico de Ar Condicionado', 'Dedetizador', 'Chaveiro',
];

const VARIATION_COUNT_OPTIONS = [2, 3, 4, 6, 15];

// ─── Visual Style Presets (A/B Testing) ───────────────────────────────────────

export interface VisualStyle {
  id: string;
  label: string;
  desc: string;
  racional: string;
  themeId: CarouselThemeId;
  shape: ShapeStyle;
  fontFamily: string;
  highlightStyle: HighlightStyle;
  colors: { bg: string; accent: string; text: string };
}

export const VISUAL_STYLES: (VisualStyle & { defaultOpacity: number })[] = [
  {
    id: 'impacto',
    label: 'Impacto Direto',
    desc: 'Urgência máxima',
    racional: 'Headline gigante, fundo escuro, máximo contraste — converte por urgência',
    themeId: 'brand-orange',
    shape: 'gradient-bar',
    fontFamily: 'Bebas Neue',
    highlightStyle: 'bold',
    colors: { bg: '#1a1205', accent: '#E8603C', text: '#FFFFFF' },
    defaultOpacity: 0.65,
  },
  {
    id: 'documental',
    label: 'Documental',
    desc: 'Autenticidade real',
    racional: 'Imagem real forte, texto mínimo — conecta por autenticidade',
    themeId: 'dark-premium',
    shape: 'none',
    fontFamily: 'Montserrat',
    highlightStyle: 'none',
    colors: { bg: '#0D0D0D', accent: '#9CA3AF', text: '#E5E7EB' },
    defaultOpacity: 0.95,
  },
  {
    id: 'social-proof',
    label: 'Social Proof',
    desc: 'Prova social',
    racional: 'Fundo claro, dados/números em destaque — converte por prova social',
    themeId: 'clean-white',
    shape: 'pill',
    fontFamily: 'Inter',
    highlightStyle: 'color',
    colors: { bg: '#FAFAFA', accent: '#E8603C', text: '#1A1A1A' },
    defaultOpacity: 0.3,
  },
  {
    id: 'provocacao',
    label: 'Provocação',
    desc: 'Indignação coletiva',
    racional: 'Copy provocativa em caixa alta — converte por raiva/indignação',
    themeId: 'brand-orange',
    shape: 'diagonal',
    fontFamily: 'Anton',
    highlightStyle: 'box',
    colors: { bg: '#1a1205', accent: '#FF4500', text: '#FFFFFF' },
    defaultOpacity: 0.55,
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    desc: 'Curiosidade limpa',
    racional: 'Limpo, pouco texto, foco na imagem — converte por curiosidade',
    themeId: 'dark-premium',
    shape: 'gradient-bar',
    fontFamily: 'Oswald',
    highlightStyle: 'color',
    colors: { bg: '#0D0D0D', accent: '#14B8A6', text: '#D1D5DB' },
    defaultOpacity: 0.8,
  },
];

// ─── Highlight System ─────────────────────────────────────────────────────────

export type HighlightStyle = 'none' | 'color' | 'bold' | 'box';

export const HIGHLIGHT_STYLES: { id: HighlightStyle; label: string }[] = [
  { id: 'none', label: 'Sem destaque' },
  { id: 'color', label: 'Cor accent' },
  { id: 'bold', label: 'Bold + sombra' },
  { id: 'box', label: 'Caixa colorida' },
];

// ─── Font System ──────────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { id: 'Montserrat', label: 'Montserrat', weight: '400;600;700;800;900' },
  { id: 'Bebas Neue', label: 'Bebas Neue', weight: '400' },
  { id: 'Oswald', label: 'Oswald', weight: '400;600;700' },
  { id: 'Anton', label: 'Anton', weight: '400' },
  { id: 'Teko', label: 'Teko', weight: '400;500;600;700' },
  { id: 'Inter', label: 'Inter', weight: '400;600;700;800;900' },
];

// ─── Inject Google Fonts ──────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
  const families = FONT_OPTIONS.map(f => `family=${f.id.replace(/ /g, '+')}:wght@${f.weight}`).join('&');
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  if (!document.head.querySelector('[data-dqef-fonts-criativo]')) {
    fontLink.setAttribute('data-dqef-fonts-criativo', 'true');
    document.head.appendChild(fontLink);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedPost {
  title: string;
  subtitle: string;
  headline: string;
  headlineHighlight?: string;
  subtext?: string;
  viralLogic: string;
  caption: string;
  bestTime: string;
  engagementTip: string;
  visualDirection: string;
}

// ─── StaticPostPreview ─────────────────────────────────────────────────────────

const PREVIEW_BASE_WIDTH = 340;

interface StaticPostPreviewProps {
  headline: string;
  headlineHighlight?: string;
  highlightStyle?: HighlightStyle;
  subtext?: string;
  imageUrl?: string;
  previewRef?: React.RefObject<HTMLDivElement>;
  format: CreativeFormat;
  exportMode?: boolean;
  textScale?: number;
  theme: CarouselTheme;
  imageOpacity?: number;
  headlineScale?: number;
  imageScale?: number;
  imageOffsetY?: number;
  shape?: ShapeStyle;
  fontFamily?: string;
  textPositionX?: number;
  textPositionY?: number;
}

function StaticPostPreview({
  headline, headlineHighlight, highlightStyle = 'color', subtext, imageUrl, previewRef, format, exportMode = false,
  textScale = 1, theme, imageOpacity = 0.52, headlineScale = 1, imageScale = 1, imageOffsetY = 0,
  shape = 'none', fontFamily = 'Montserrat', textPositionX = 10, textPositionY = 80,
}: StaticPostPreviewProps) {
  const exportScale = exportMode ? format.width / PREVIEW_BASE_WIDTH : 1;

  const ts = (size: string) => {
    const scale = textScale * exportScale;
    const pxMatch = size.match(/^(\d+(?:\.\d+)?)px$/);
    if (pxMatch) return `${parseFloat(pxMatch[1]) * scale}px`;
    const clampMatch = size.match(/^clamp\((\d+(?:\.\d+)?)px,\s*([^,]+),\s*(\d+(?:\.\d+)?)px\)$/);
    if (clampMatch) {
      if (exportMode) return `${parseFloat(clampMatch[3]) * scale}px`;
      return `clamp(${parseFloat(clampMatch[1]) * textScale}px, ${clampMatch[2]}, ${parseFloat(clampMatch[3]) * textScale}px)`;
    }
    return size;
  };

  const sz = format.safeZone;
  const paddingStyle = exportMode
    ? { paddingTop: sz.top, paddingRight: sz.right, paddingBottom: sz.bottom, paddingLeft: sz.left }
    : {
        paddingTop: `${(sz.top / format.height) * 100}%`,
        paddingRight: `${(sz.right / format.width) * 100}%`,
        paddingBottom: `${(sz.bottom / format.height) * 100}%`,
        paddingLeft: `${(sz.left / format.width) * 100}%`,
      };

  const renderHeadline = (text: string, highlight?: string) => {
    if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
      return <span style={{ color: theme.headlineColor }}>{text}</span>;
    }
    // Multi-word highlight: split by all occurrences
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    const getHighlightCSS = (): React.CSSProperties => {
      switch (highlightStyle) {
        case 'color':
          return { color: theme.highlightColor || theme.headlineColor };
        case 'bold':
          return {
            color: theme.highlightColor || theme.headlineColor,
            textShadow: '0 2px 12px rgba(232,96,60,0.5), 0 0 4px rgba(232,96,60,0.3)',
            WebkitTextStroke: '0.5px currentColor',
          };
        case 'box':
          return {
            color: '#FFFFFF',
            backgroundColor: theme.highlightColor || '#E8603C',
            borderRadius: '4px',
            padding: '1px 6px',
            display: 'inline',
          };
        default:
          return { color: theme.headlineColor };
      }
    };

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part)
            ? <span key={i} style={getHighlightCSS()}>{part}</span>
            : <span key={i} style={{ color: theme.headlineColor }}>{part}</span>
        )}
      </>
    );
  };

  const exportDimensions = exportMode ? { width: format.width, height: format.height } : {};

  // Shape overlays — improved visibility
  const renderShape = () => {
    const isDark = theme.id !== 'clean-white';
    const brandColor = '#E8603C';
    switch (shape) {
      case 'pill':
        return (
          <div style={{
            position: 'absolute', bottom: '12%', left: '6%', right: '6%',
            height: '14%', borderRadius: '999px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(232,96,60,0.15), rgba(232,96,60,0.05))'
              : 'linear-gradient(135deg, rgba(26,26,26,0.08), rgba(26,26,26,0.03))',
            backdropFilter: 'blur(12px)',
            border: isDark ? '1px solid rgba(232,96,60,0.2)' : '1px solid rgba(26,26,26,0.08)',
            zIndex: 5,
          }} />
        );
      case 'box':
        return (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%',
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)'
              : 'linear-gradient(to top, rgba(232,96,60,0.12) 0%, rgba(232,96,60,0.04) 60%, transparent 100%)',
            zIndex: 5,
          }} />
        );
      case 'diagonal':
        return (
          <>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
              background: isDark
                ? 'linear-gradient(160deg, transparent 25%, rgba(0,0,0,0.7) 100%)'
                : 'linear-gradient(160deg, transparent 25%, rgba(232,96,60,0.1) 100%)',
              zIndex: 5,
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              width: '100%', height: '4px',
              background: `linear-gradient(90deg, ${brandColor}, transparent)`,
              zIndex: 6,
            }} />
          </>
        );
      case 'gradient-bar':
        return (
          <>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
              background: isDark
                ? 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.05) 0%, transparent 100%)',
              zIndex: 5,
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '5px',
              background: `linear-gradient(90deg, ${brandColor}, #FF8A65, ${brandColor})`,
              zIndex: 15,
            }} />
          </>
        );
      case 'circle-accent':
        return (
          <>
            <div style={{
              position: 'absolute', top: '5%', right: '5%',
              width: '15%', aspectRatio: '1', borderRadius: '50%',
              background: `radial-gradient(circle, ${brandColor}40, ${brandColor}15)`,
              border: `2px solid ${brandColor}55`,
              boxShadow: `0 0 30px ${brandColor}30`,
              zIndex: 5,
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
              background: isDark
                ? 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.05) 0%, transparent 100%)',
              zIndex: 4,
            }} />
          </>
        );
      default: return null;
    }
  };

  return (
    <div
      ref={previewRef}
      style={{
        background: theme.bg,
        aspectRatio: exportMode ? undefined : `${format.width}/${format.height}`,
        ...exportDimensions,
        width: exportMode ? format.width : '100%',
        position: 'relative',
        borderRadius: exportMode ? '0' : '8px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {imageUrl && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: imageScale === 1 ? 'cover' : `${imageScale * 100}%`,
            backgroundPosition: `center ${50 + imageOffsetY}%`,
            opacity: imageOpacity, zIndex: 0,
          }} />
          <div style={{ position: 'absolute', inset: 0, background: theme.overlayGradient, zIndex: 1 }} />
        </>
      )}

      {renderShape()}

      <div style={{
        position: 'absolute',
        left: `${textPositionX}%`,
        top: `${textPositionY}%`,
        transform: 'translateY(-100%)',
        maxWidth: `${100 - textPositionX - 4}%`,
        zIndex: 10,
      }}>
        <div style={{
          fontFamily: `${fontFamily}, sans-serif`,
          fontWeight: 900,
          fontSize: ts(`clamp(${14 * headlineScale}px, ${3.8 * headlineScale}vw, ${22 * headlineScale}px)`),
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          marginBottom: subtext ? '8px' : '0',
          whiteSpace: 'pre-line' as const,
          textTransform: 'uppercase',
        }}>
          {renderHeadline(headline, headlineHighlight)}
        </div>
        {subtext && (
          <div style={{
            fontFamily: `${fontFamily}, sans-serif`,
            fontWeight: 600,
            fontSize: ts('10px'),
            color: theme.subtextColor,
            lineHeight: 1.45,
            letterSpacing: '0.03em',
          }}>{subtext}</div>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: exportMode ? `${10 * exportScale}px` : '10px',
        right: exportMode ? `${10 * exportScale}px` : '10px',
        zIndex: 10, opacity: 0.55,
      }}>
        <img src={dqfIcon} alt="DQF" style={{
          width: exportMode ? `${18 * exportScale}px` : '18px',
          height: exportMode ? `${18 * exportScale}px` : '18px',
          filter: theme.iconFilter,
        }} />
      </div>
    </div>
  );
}

// ─── ThemePicker ──────────────────────────────────────────────────────────────

function ThemePicker({ selected, onChange }: { selected: CarouselThemeId; onChange: (id: CarouselThemeId) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">TEMA VISUAL</p>
      <div className="grid grid-cols-3 gap-2">
        {CAROUSEL_THEMES.map(theme => (
          <button key={theme.id} onClick={() => onChange(theme.id)}
            className={cn('group relative rounded-xl border-2 p-2.5 transition-all text-left',
              selected === theme.id ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:border-border/70 bg-card/50')}>
            <div className="flex gap-1 mb-2">
              {theme.previewSwatch.map((c, i) => (
                <div key={i} className="h-3 flex-1 rounded-sm"
                  style={{ background: c, border: c === '#FFFFFF' || c === '#F5F5F0' ? '1px solid rgba(0,0,0,0.1)' : 'none' }} />
              ))}
            </div>
            <p className="text-[10px] font-bold text-foreground leading-none">{theme.label}</p>
            <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{theme.description}</p>
            {selected === theme.id && (
              <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FormatPicker ─────────────────────────────────────────────────────────────

function FormatPicker({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  const platforms = [...new Set(CREATIVE_FORMATS.map(f => f.platform))];
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">FORMATO</p>
      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {platforms.map(platform => {
          const formats = CREATIVE_FORMATS.filter(f => f.platform === platform);
          return (
            <div key={platform}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{platform}</p>
              <div className="grid grid-cols-2 gap-1">
                {formats.map(fmt => (
                  <button key={fmt.id} onClick={() => onChange(fmt.id)}
                    className={cn('rounded-lg border px-2 py-1 text-left transition-all text-[10px]',
                      selected === fmt.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    <span className="font-bold">{fmt.label}</span>
                    <span className="block text-[9px] font-mono opacity-70">{fmt.width}×{fmt.height}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ShapePicker ──────────────────────────────────────────────────────────────

function ShapePicker({ selected, onChange }: { selected: ShapeStyle; onChange: (s: ShapeStyle) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">SHAPE OVERLAY</p>
      <div className="grid grid-cols-3 gap-1.5">
        {SHAPE_STYLES.map(s => (
          <button key={s.id} onClick={() => onChange(s.id)}
            className={cn('rounded-lg border px-2 py-1.5 text-left transition-all',
              selected === s.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}>
            <p className="text-[10px] font-bold text-foreground">{s.label}</p>
            <p className="text-[8px] text-muted-foreground">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── NichoPicker ──────────────────────────────────────────────────────────────

function NichoPicker({ selected, onChange }: { selected: string[]; onChange: (n: string[]) => void }) {
  const toggle = (n: string) => {
    if (selected.includes(n)) onChange(selected.filter(x => x !== n));
    else onChange([...selected, n]);
  };

  return (
    <div>
      <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Nichos (multi-seleção)</p>
      <div className="flex flex-wrap gap-1.5">
        {NICHOS.map(n => (
          <button key={n} onClick={() => toggle(n)}
            className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all',
              selected.includes(n) ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Reference Upload ─────────────────────────────────────────────────────────

function ReferenceUploadPanel({
  onReferenceChange,
}: {
  onReferenceChange: (ref: { text: string; imageUrl: string | null }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [referenceText, setReferenceText] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const cleanHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, svg, link, meta').forEach(el => el.remove());
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    setFileName(file.name);

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setReferenceImageUrl(url);
        onReferenceChange({ text: referenceText, imageUrl: url });
      };
      reader.readAsDataURL(file);
    } else if (['txt', 'html', 'htm', 'md'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = (reader.result as string) || '';
        const isHtml = ext === 'html' || ext === 'htm' || /<\/?[a-z][\s\S]*>/i.test(raw);
        const text = isHtml ? cleanHtml(raw) : raw.trim();
        setReferenceText(text);
        onReferenceChange({ text, imageUrl: referenceImageUrl });
      };
      reader.readAsText(file);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePaste = (text: string) => {
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(text);
    const cleaned = isHtml ? cleanHtml(text) : text.trim();
    setReferenceText(cleaned);
    onReferenceChange({ text: cleaned, imageUrl: referenceImageUrl });
  };

  const clearAll = () => {
    setReferenceText('');
    setReferenceImageUrl(null);
    setFileName(null);
    onReferenceChange({ text: '', imageUrl: null });
  };

  const hasReference = !!referenceText || !!referenceImageUrl;

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-all',
      hasReference ? 'border-primary bg-primary/5' : 'border-border bg-card'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Referência de Copy</span>
          <Badge variant={hasReference ? 'default' : 'outline'} className="text-[9px] h-4">
            {hasReference ? '✓ Ativa' : 'Opcional'}
          </Badge>
        </div>
        {hasReference && (
          <Button size="sm" variant="ghost" className="h-6 text-[9px] text-destructive" onClick={clearAll}>
            <Trash2 className="h-3 w-3 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Insira uma referência (texto, HTML, imagem ou PDF) e a IA criará variações baseadas exclusivamente nela.
      </p>

      {/* Upload button */}
      <input ref={fileRef} type="file" accept="image/*,.txt,.html,.htm,.md,.pdf" className="hidden" onChange={handleFile} />
      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        {fileName ? `📎 ${fileName}` : 'Upload: Imagem, TXT, HTML ou PDF'}
      </Button>

      {/* Image preview */}
      {referenceImageUrl && (
        <div className="relative">
          <img src={referenceImageUrl} alt="ref" className="w-full max-h-32 rounded-lg object-contain border border-border bg-black/20" />
          <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-5 w-5 p-0"
            onClick={() => { setReferenceImageUrl(null); onReferenceChange({ text: referenceText, imageUrl: null }); }}>
            ×
          </Button>
        </div>
      )}

      {/* Text area */}
      <Textarea
        placeholder="Cole aqui o texto, HTML ou copy de referência...&#10;A IA vai analisar e criar variações mantendo o mesmo tema e promessa."
        value={referenceText}
        onChange={e => handlePaste(e.target.value)}
        className={cn(
          'min-h-[70px] text-xs bg-background border-border resize-none',
          hasReference && referenceText && 'border-primary/30'
        )}
        rows={3}
      />

      {hasReference && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-2">
          <p className="text-[10px] font-bold text-primary">🎯 Referência ativa</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Ao gerar, a IA analisará esta referência com Claude Sonnet e criará variações fiéis ao tema original.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Criativo() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const { campaigns } = useCampaigns();
  const { contents } = useCalendarContents();

  // Main tab
  const [activeTab, setActiveTab] = useState<string>('single');

  // Config state
  const [selectedPersona, setSelectedPersona] = useState<string>(initialEstrategias[0].id);
  const [selectedAngle, setSelectedAngle] = useState<string>('Dinheiro');
  const [selectedChannel, setSelectedChannel] = useState<string>('Instagram Feed');
  const [selectedObjective, setSelectedObjective] = useState<string>('Conversão');
  const [additionalContext, setAdditionalContext] = useState('');
  const [campaignContext, setCampaignContext] = useState('');
  const [strategyContext, setStrategyContext] = useState('');
  const [dataScienceContext, setDataScienceContext] = useState<string | null>(null);
  const [selectedNichos, setSelectedNichos] = useState<string[]>(['Piscineiro']);
  const [imagePromptText, setImagePromptText] = useState('');

  // Benchmark
  const [selectedBenchmark, setSelectedBenchmark] = useState<any>(null);

  // Reference images
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  
  // Copy reference (structured)
  const [copyReference, setCopyReference] = useState<string>('');
  const [referenceData, setReferenceData] = useState<{ text: string; imageUrl: string | null }>({ text: '', imageUrl: null });
  
  // Batch generation progress
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Canvas state
  const [selectedFormatId, setSelectedFormatId] = useState<string>('ig-feed-4x5');
  const [selectedThemeId, setSelectedThemeId] = useState<CarouselThemeId>('brand-orange');
  const [selectedShape, setSelectedShape] = useState<ShapeStyle>('none');
  const [textScale, setTextScale] = useState(1);
  const [headlineScale, setHeadlineScale] = useState(1);
  const [imageOpacity, setImageOpacity] = useState(0.52);
  const [imageScale, setImageScale] = useState(1);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [editableHeadline, setEditableHeadline] = useState('SEU HEADLINE AQUI');
  const [editableSubtext, setEditableSubtext] = useState('Subtexto da arte');
  const [headlineHighlight, setHeadlineHighlight] = useState('');
  const [selectedHighlightStyle, setSelectedHighlightStyle] = useState<HighlightStyle>('color');
  const [selectedFont, setSelectedFont] = useState('Montserrat');
  const [textPositionX, setTextPositionX] = useState(10);
  const [textPositionY, setTextPositionY] = useState(88);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedPost | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  // Variations state
  const [variations, setVariations] = useState<CreativeVariation[]>([]);
  const [variationCount, setVariationCount] = useState(3);
  const [generatingVariation, setGeneratingVariation] = useState<string | null>(null);
  const [selectedVisualStyle, setSelectedVisualStyle] = useState<string | null>(null);
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<{ current: number; total: number } | null>(null);

  // Drafts state
  const [drafts, setDrafts] = useState<CriativoDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedFormat = CREATIVE_FORMATS.find(f => f.id === selectedFormatId) || CREATIVE_FORMATS[0];
  const selectedTheme = CAROUSEL_THEMES.find(t => t.id === selectedThemeId) || CAROUSEL_THEMES[0];
  const persona = initialEstrategias.find(e => e.id === selectedPersona)!;
  const angle = ANGLES.find(a => a.id === selectedAngle)!;

  // Load briefing from Biblioteca
  useEffect(() => {
    const raw = localStorage.getItem('ideacao_to_criativo');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.context) setAdditionalContext(data.context);
      if (data.title) setEditableHeadline(data.title.toUpperCase());
      if (data.copy_text) setEditableSubtext(data.copy_text);
      if (data.visual_direction) {
        setAdditionalContext(prev => prev + (prev ? '\n\n' : '') + `Direção visual: ${data.visual_direction}`);
      }
      if (data.format) {
        const match = CREATIVE_FORMATS.find(f => f.width === data.format.width && f.height === data.format.height);
        if (match) setSelectedFormatId(match.id);
      }
      setShowCanvas(true);
      toast({ title: '📋 Briefing da Biblioteca carregado', description: `Formato: ${data.format?.label || 'Auto'}` });
      localStorage.removeItem('ideacao_to_criativo');
    } catch {}
  }, []);

  // Load Instagram reference
  useEffect(() => {
    const raw = localStorage.getItem('ig_ref_to_criativo');
    if (!raw) return;
    try {
      const ref = JSON.parse(raw);
      const refBriefing = [
        '📌 REFERÊNCIA DE POST INSTAGRAM:',
        ref.caption && `Caption: "${ref.caption.slice(0, 300)}"`,
        ref.engRate && `Engagement Rate: ${ref.engRate}%`,
        ref.likes && `Likes: ${ref.likes} | Saves: ${ref.saves} | Shares: ${ref.shares}`,
      ].filter(Boolean).join('\n');
      setAdditionalContext(refBriefing);
      setSelectedChannel('Instagram Feed');
      setShowCanvas(true);
      toast({ title: '📋 Referência do Instagram carregada' });
      localStorage.removeItem('ig_ref_to_criativo');
    } catch {}
  }, []);

  // Load task
  useEffect(() => {
    if (!taskId) return;
    (async () => {
      const { data } = await (supabase as any).from('campaign_tasks').select('*').eq('id', taskId).single();
      if (data) {
        const ctx = data.campaign_context || {};
        if (ctx.emotionalAngle) {
          const a = ANGLES.find(a => a.id === ctx.emotionalAngle);
          if (a) setSelectedAngle(a.id);
        }
        if (data.channel) {
          const ch = CHANNELS.find(c => c.id.startsWith(data.channel));
          if (ch) setSelectedChannel(ch.id);
        }
        const briefingParts = [
          ctx.objective && `📋 OBJETIVO: ${ctx.objective}`,
          ctx.campaignSummary && `📝 RESUMO: ${ctx.campaignSummary}`,
          ctx.keyMessage && `💡 MENSAGEM CENTRAL: ${ctx.keyMessage}`,
        ].filter(Boolean).join('\n');
        if (briefingParts) setAdditionalContext(briefingParts);
        toast({ title: '📋 Briefing carregado', description: `Tarefa: ${data.title}` });
      }
    })();
  }, [taskId]);

  // Load drafts
  useEffect(() => {
    if (user) fetchDrafts();
  }, [user]);

  async function fetchDrafts() {
    if (!user) return;
    setLoadingDrafts(true);
    try {
      const { data } = await supabase
        .from('creative_drafts')
        .select('id, sigla, name, status, created_at, updated_at, angle, channel, format_id, context')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (data) {
        setDrafts(data.map((d: any) => ({
          id: d.id,
          sigla: d.sigla,
          name: d.name,
          status: d.status,
          created_at: d.created_at,
          updated_at: d.updated_at,
          headline: 'HEADLINE',
          headlineHighlight: '',
          subtext: '',
          caption: '',
          imageUrl: null,
          angle: d.angle || 'Dinheiro',
          channel: d.channel || 'Instagram Feed',
          objective: 'Conversão',
          nichos: ['Piscineiro'],
          formatId: d.format_id || 'ig-feed-4x5',
          themeId: 'brand-orange',
          shape: 'none',
          context: d.context || '',
          imagePrompt: '',
          variations: [],
        })));
      }
    } catch {}
    setLoadingDrafts(false);
  }

  async function handleSaveDraft() {
    if (!user) return;
    setSavingDraft(true);
    try {
      const { data: siglaData } = await supabase.rpc('generate_draft_sigla');
      const sigla = siglaData || `CRI-${Date.now()}`;

      const sanitizeImageUrl = (url?: string | null) =>
        url && url.startsWith('data:image/') ? null : (url ?? null);

      const sanitizedVariations = variations.map((v) => ({
        ...v,
        imageUrl: sanitizeImageUrl(v.imageUrl),
      }));
      
      const draftData = {
        user_id: user.id,
        sigla,
        name: editableHeadline.slice(0, 60) || 'Criativo sem título',
        status: 'draft',
        angle: selectedAngle,
        channel: selectedChannel,
        format_id: selectedFormatId,
        context: additionalContext,
        carousel_data: {
          headline: editableHeadline,
          headlineHighlight,
          subtext: editableSubtext,
          caption: result?.caption || '',
          imageUrl: sanitizeImageUrl(postImageUrl),
          objective: selectedObjective,
          nichos: selectedNichos,
          themeId: selectedThemeId,
          shape: selectedShape,
          imagePrompt: imagePromptText,
          variations: sanitizedVariations,
          textScale,
          headlineScale,
          imageOpacity,
          imageScale,
          imageOffsetY,
        },
      };

      const { error } = await supabase.from('creative_drafts').insert(draftData as any);
      if (error) throw error;
      toast({ title: `💾 Rascunho salvo!`, description: `Sigla: ${sigla}` });
      await fetchDrafts();
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: String(e), variant: 'destructive' });
    }
    setSavingDraft(false);
  }

  async function handleLoadDraft(draft: CriativoDraft) {
    const { data, error } = await supabase
      .from('creative_drafts')
      .select('angle, channel, format_id, context, carousel_data')
      .eq('id', draft.id)
      .single();

    if (error || !data) {
      toast({ title: 'Erro ao carregar rascunho', description: error?.message || 'Dados indisponíveis', variant: 'destructive' });
      return;
    }

    const carousel = (data as any).carousel_data || {};
    setEditableHeadline(carousel.headline || 'HEADLINE');
    setHeadlineHighlight(carousel.headlineHighlight || '');
    setEditableSubtext(carousel.subtext || '');
    setPostImageUrl(carousel.imageUrl || null);
    setSelectedAngle((data as any).angle || 'Dinheiro');
    setSelectedChannel((data as any).channel || 'Instagram Feed');
    setSelectedObjective(carousel.objective || 'Conversão');
    setSelectedNichos(carousel.nichos || ['Piscineiro']);
    setSelectedFormatId((data as any).format_id || 'ig-feed-4x5');
    setSelectedThemeId((carousel.themeId || 'brand-orange') as CarouselThemeId);
    setSelectedShape((carousel.shape || 'none') as ShapeStyle);
    setAdditionalContext((data as any).context || '');
    setImagePromptText(carousel.imagePrompt || '');
    setVariations(Array.isArray(carousel.variations) ? carousel.variations : []);
    setShowCanvas(true);
    setActiveTab('single');
    toast({ title: '📂 Rascunho carregado', description: draft.sigla });
  }

  async function handleDeleteDraft(draftId: string) {
    try {
      await supabase.from('creative_drafts').delete().eq('id', draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      toast({ title: 'Rascunho excluído' });
    } catch {}
  }

  // ─── Structured TXT Brief Parser ─────────────────────────────────────────
  // Detects structured creative briefs (like the DQEF campaign TXTs) and parses
  // frames, copies, CTAs directly for maximum precision instead of generic AI.
  const parseStructuredBrief = (text: string): {
    isStructured: boolean;
    frames: { id: string; prompt: string }[];
    variations: { frameId: string; angle: string; headline: string; caption: string; cta: string }[];
    theme?: string;
    channel?: string;
    format?: string;
  } | null => {
    // Detect structured brief markers
    const hasFrames = /── FRAME [A-Z]/i.test(text);
    const hasVariations = /── VARIAÇÃO \d+/i.test(text);
    if (!hasFrames && !hasVariations) return null;

    const frames: { id: string; prompt: string }[] = [];
    const variations: { frameId: string; angle: string; headline: string; caption: string; cta: string }[] = [];

    // Extract frames
    const frameRegex = /── FRAME ([A-Z]) ─+\s*\n(?:Prompt de Imagem[^:]*:\s*\n)?([\s\S]*?)(?=── FRAME [A-Z]|════|$)/gi;
    let fm;
    while ((fm = frameRegex.exec(text)) !== null) {
      const id = fm[1].trim();
      const prompt = fm[2].trim().split('\n').map(l => l.trim()).filter(Boolean).join(' ');
      if (prompt) frames.push({ id, prompt });
    }

    // Extract variations
    const varRegex = /── VARIAÇÃO (\d+)[^─]*· Frame ([A-Z])[^─]*· (\w+)[^─]*─+\s*\n([\s\S]*?)(?=── VARIAÇÃO \d+|════|$)/gi;
    let vm;
    while ((vm = varRegex.exec(text)) !== null) {
      const frameId = vm[2].trim();
      const angle = vm[3].trim();
      const block = vm[4].trim();
      
      const headlineMatch = block.match(/COPY PRINCIPAL:\s*(.+?)(?:\n|$)/i);
      const captionMatch = block.match(/COPY CAPTION:\s*([\s\S]*?)(?:CTA:|$)/i);
      const ctaMatch = block.match(/CTA:\s*(.+?)(?:\n|$)/i);
      
      let headline = headlineMatch?.[1]?.trim() || '';
      // Handle multi-line headlines (indented continuations)
      const nextLines = block.split('\n');
      const hlIdx = nextLines.findIndex(l => /COPY PRINCIPAL:/i.test(l));
      if (hlIdx >= 0 && hlIdx + 1 < nextLines.length) {
        const nextLine = nextLines[hlIdx + 1]?.trim();
        if (nextLine && !/COPY (CAPTION|CTA)/i.test(nextLine)) {
          headline += ' ' + nextLine;
        }
      }
      
      const caption = captionMatch?.[1]?.trim().replace(/\n/g, ' ') || '';
      const cta = ctaMatch?.[1]?.trim().replace(/→/g, '').trim() || 'SAIBA MAIS';

      variations.push({ frameId, angle, headline, caption, cta });
    }

    // Extract metadata
    const channelMatch = text.match(/CANAL:\s*(.+?)(?:\n|·)/i);
    const formatMatch = text.match(/FORMATO:\s*(.+?)(?:\n|·)/i);
    const themeMatch = text.match(/TEMA:\s*(.+?)(?:\n|$)/i);

    return {
      isStructured: variations.length > 0,
      frames,
      variations,
      theme: themeMatch?.[1]?.trim(),
      channel: channelMatch?.[1]?.trim(),
      format: formatMatch?.[1]?.trim(),
    };
  };

  // Build full context
  const buildFullContext = () => {
    const parts: string[] = [];
    if (campaignContext) parts.push(campaignContext);
    if (strategyContext) parts.push(strategyContext);
    if (dataScienceContext) parts.push(dataScienceContext);
    if (additionalContext) parts.push(additionalContext);
    if (copyReference) {
      parts.push(`=== REFERÊNCIA DE COPY (ÂNCORA OBRIGATÓRIA) ===\n${copyReference}\n➡️ Mantenha tema, oferta e promessa central da referência.\n➡️ NÃO trocar assunto/nicho.\n➡️ Variar ângulo e estilo sem perder a essência da copy base.`);
    }
    if (imagePromptText) parts.push(`PROMPT DE IMAGEM: ${imagePromptText}`);
    if (selectedBenchmark) {
      const b = selectedBenchmark;
      parts.push(`=== BENCHMARK CONCORRENTE ===\nNome: ${b.competitor_name}\nPlataforma: ${b.platform || 'Facebook Ads'}\n${b.ai_insights ? `Insights: ${JSON.stringify(b.ai_insights).slice(0, 500)}` : ''}\n➡️ Criar arte que SUPERE esta referência usando nossa IDV`);
    }
    if (selectedPersona !== 'est-000' && selectedNichos.length > 0) {
      parts.push(`NICHOS ALVO: ${selectedNichos.join(', ')}`);
    }
    if (referenceImages.length > 0) {
      parts.push(`[${referenceImages.length} imagem(ns) de referência anexada(s)]`);
    }
    parts.push(`FORMATO: ${selectedFormat.label} (${selectedFormat.width}×${selectedFormat.height})`);
    return parts.filter(Boolean).join('\n\n').trim();
  };

  // Generate single — uses analyze-reference when reference is active
  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    const hasReference = !!(referenceData.text || referenceData.imageUrl);
    const isGeneralPersona = selectedPersona === 'est-000';

    try {
      if (hasReference) {
        // ─── REFERENCE MODE: Use analyze-reference for precise copy ───
        const { data, error } = await supabase.functions.invoke('analyze-reference', {
          body: {
            referenceText: referenceData.text,
            referenceImageUrl: referenceData.imageUrl,
            count: 1,
            angles: selectedAngle === 'IA-Decide'
              ? ['IA escolhe o melhor ângulo emocional baseado na referência']
              : [selectedAngle],
            channel: selectedChannel,
            objective: selectedObjective,
            persona: isGeneralPersona
              ? 'Prestadores de serviço autônomos brasileiros em geral'
              : persona.persona,
            styles: [VISUAL_STYLES.find(s => s.id === selectedVisualStyle) || VISUAL_STYLES[0]].map(s => ({ label: s.label, racional: s.racional })),
          },
        });
        if (error) throw error;
        if (!data?.success || !data?.result?.variations?.length) {
          throw new Error(data?.error || 'Nenhum resultado retornado');
        }
        const v = data.result.variations[0];
        const post: GeneratedPost = {
          title: String(v.headline || ''),
          subtitle: String(v.body || v.cta || ''),
          headline: String(v.headline || '').toUpperCase(),
          headlineHighlight: String(v.headline || '').split(' ').find((w: string) => w.length >= 5) || '',
          subtext: String(v.body || ''),
          viralLogic: String(v.viralLogic || data.result.analysis?.theme || ''),
          caption: String(v.caption || ''),
          bestTime: '18h-21h',
          engagementTip: 'CTA direto com urgência',
          visualDirection: String(v.imagePrompt || ''),
        };
        setResult(post);
        setEditableHeadline(post.headline);
        setEditableSubtext(post.subtext || '');
        setHeadlineHighlight(post.headlineHighlight || '');
        if (v.imagePrompt) setImagePromptText(v.imagePrompt);
        setShowCanvas(true);
        toast({ title: '🎯 Arte criada a partir da referência!', description: `Análise: "${data.result.analysis?.theme || 'processada'}"` });
      } else {
        // ─── STANDARD MODE: Use generate-carousel ───
        const { data, error } = await supabase.functions.invoke('generate-carousel', {
          body: {
            persona: persona.persona,
            angle: selectedAngle === 'IA-Decide' ? 'Escolha o melhor ângulo emocional baseado no contexto e referência fornecida' : selectedAngle,
            channel: selectedChannel,
            format: 'Post Estático',
            objective: selectedObjective,
            personaData: {
              profile: persona.profile,
              painPoints: persona.painPoints,
              hooks: persona.hooks,
              approach: persona.approach,
              ageRange: persona.ageRange,
              avgRate: persona.avgRate,
            },
            platformData: {
              activeCampaigns: campaigns.filter(c => c.status === 'Ativa').length,
              publishedPosts: contents.filter(c => c.status === 'Publicado').length,
              topChannel: 'Instagram',
            },
            additionalContext: buildFullContext(),
          },
        });
        if (error) throw error;
        if (data?.carousel) {
          const c = data.carousel;
          const post: GeneratedPost = {
            title: c.title,
            subtitle: c.subtitle,
            headline: c.slides?.[0]?.headline || c.title,
            headlineHighlight: c.slides?.[0]?.headline?.split(' ').pop() || '',
            subtext: c.slides?.[0]?.body || c.subtitle,
            viralLogic: c.viralLogic,
            caption: c.caption,
            bestTime: c.bestTime,
            engagementTip: c.engagementTip,
            visualDirection: c.slides?.[0]?.visual || '',
          };
          setResult(post);
          setEditableHeadline(post.headline.toUpperCase());
          setEditableSubtext(post.subtext || '');
          setHeadlineHighlight(post.headlineHighlight || '');
          setShowCanvas(true);
        }
      }
    } catch (e) {
      toast({ title: 'Erro ao gerar', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Generate full AI image (Nano Banana Pro) — no template, AI creates complete visual
  const handleGenerateFullArt = async () => {
    if (!user) return;
    setLoading(true);
    const hasReference = !!(referenceData.text || referenceData.imageUrl);

    try {
      // Step 1: Generate copy from reference or context
      if (hasReference) {
        const { data, error } = await supabase.functions.invoke('analyze-reference', {
          body: {
            referenceText: referenceData.text,
            referenceImageUrl: referenceData.imageUrl,
            count: 1,
            angles: selectedAngle === 'IA-Decide'
              ? ['IA escolhe o melhor ângulo emocional baseado na referência']
              : [selectedAngle],
            channel: selectedChannel,
            objective: selectedObjective,
            persona: selectedPersona === 'est-000'
              ? 'Prestadores de serviço autônomos brasileiros em geral'
              : persona.persona,
            styles: [{ label: 'IA Completa', racional: 'IA cria o estilo visual completo baseado na referência' }],
          },
        });
        if (error) throw error;
        if (data?.success && data?.result?.variations?.length) {
          const v = data.result.variations[0];
          setEditableHeadline(String(v.headline || '').toUpperCase());
          setEditableSubtext(String(v.body || ''));
          setHeadlineHighlight(String(v.headline || '').split(' ').find((w: string) => w.length >= 5) || '');
          setResult({
            title: String(v.headline || ''),
            subtitle: String(v.body || ''),
            headline: String(v.headline || '').toUpperCase(),
            headlineHighlight: '',
            subtext: String(v.body || ''),
            viralLogic: String(v.viralLogic || ''),
            caption: String(v.caption || ''),
            bestTime: '18h-21h',
            engagementTip: '',
            visualDirection: String(v.imagePrompt || ''),
          });
        }
      }

      // Step 2: Generate the full image with Nano Banana Pro
      const contextForImage = referenceData.text
        ? `Referência de copy: "${referenceData.text.slice(0, 200)}". `
        : '';
      const headlineForImage = editableHeadline || 'HEADLINE';
      const subtextForImage = editableSubtext || '';
      
      const artPrompt = imagePromptText
        ? imagePromptText
        : `${contextForImage}Create a professional marketing ad background for Brazilian autonomous service providers (prestadores de serviço). The image should work as a backdrop for text overlay with headline "${headlineForImage}" and subtext "${subtextForImage}". Real Brazilian worker environment, documentary photography style, warm natural lighting, 4K photorealistic. Leave space for text in the lower-left area with good contrast. Format: ${selectedFormat.ratio}. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS in the image. IMPORTANT: Show diverse Brazilian workers in PROFESSIONAL, DIGNIFIED settings. NO favelas, NO poverty imagery, NO racial stereotypes. Clean workshops, organized job sites, modern homes.`;

      const response = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt: artPrompt, quality: 'high' },
      });

      if (response.data?.imageUrl) {
        setPostImageUrl(response.data.imageUrl);
        setImageOpacity(0.85);
        setShowCanvas(true);
        saveImageToLibrary(response.data.imageUrl, artPrompt.slice(0, 100));
        toast({ title: '🎨 Arte completa gerada!', description: 'Imagem criada com Nano Banana Pro. Textos editáveis acima.' });
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      }
    } catch (e) {
      toast({ title: 'Erro ao gerar arte completa', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Apply visual style preset
  const applyVisualStyle = (styleId: string) => {
    const style = VISUAL_STYLES.find(s => s.id === styleId);
    if (!style) return;
    setSelectedVisualStyle(styleId);
    setSelectedThemeId(style.themeId);
    setSelectedShape(style.shape);
    setSelectedFont(style.fontFamily);
    setSelectedHighlightStyle(style.highlightStyle);
  };

  // Generate variations
  const handleGenerateVariations = async (countOverride?: number) => {
    const targetVariationCount = countOverride ?? variationCount;
    setLoading(true);
    setVariations([]);
    const anglesPool = selectedAngle === 'IA-Decide'
      ? ['IA escolhe o melhor ângulo emocional baseado na referência']
      : [selectedAngle];
    const isGeneralPersona = selectedPersona === 'est-000';
    const hasReference = !!(referenceData.text || referenceData.imageUrl);

    try {
      // ─── CHECK FOR STRUCTURED BRIEF (TXT parsed) ───
      const structuredBrief = hasReference && referenceData.text
        ? parseStructuredBrief(referenceData.text)
        : null;

      if (structuredBrief && structuredBrief.isStructured && structuredBrief.variations.length > 0) {
        // ─── STRUCTURED BRIEF MODE: Direct parsing, maximum precision ───
        setBatchProgress({ current: 0, total: structuredBrief.variations.length });

        const angleMap: Record<string, string> = {
          'Urgência': 'Urgência', 'Pertencimento': 'Orgulho', 'Oportunidade': 'Dinheiro',
          'Raiva': 'Raiva', 'Alívio': 'Alívio', 'Dinheiro': 'Dinheiro', 'Orgulho': 'Orgulho',
        };

        // Create a frame→prompt lookup
        const framePrompts = new Map(structuredBrief.frames.map(f => [f.id, f.prompt]));

        const newVariations: CreativeVariation[] = structuredBrief.variations.map((v, i) => {
          const style = VISUAL_STYLES[i % VISUAL_STYLES.length];
          const mappedAngle = angleMap[v.angle] || v.angle;
          
          // Pick highlight words: longest impactful words from headline
          const stopWords = ['VOCÊ', 'QUE', 'COM', 'SEM', 'POR', 'DOS', 'DAS', 'NOS', 'NAS', 'PARA', 'COMO', 'UMA', 'MAIS', 'SEUS', 'SUAS', 'ESSE', 'ESSA', 'ESTE', 'ESTA', 'AINDA', 'TODO', 'TODA', 'QUANDO', 'QUEM', 'ONDE'];
          const hlWords = v.headline.toUpperCase().split(/\s+/)
            .filter(w => w.length >= 4 && !stopWords.includes(w))
            .sort((a, b) => b.length - a.length)
            .slice(0, 2)
            .join('|');

          // Map angle to shape
          const shapeMap: Record<string, ShapeStyle> = {
            'Urgência': 'gradient-bar', 'Pertencimento': 'none', 'Oportunidade': 'diagonal',
            'Raiva': 'diagonal', 'Alívio': 'pill', 'Dinheiro': 'gradient-bar', 'Orgulho': 'circle-accent',
          };

          // Map angle to opacity
          const opacityMap: Record<string, number> = {
            'Urgência': 0.6, 'Pertencimento': 0.85, 'Oportunidade': 0.7,
          };

          return {
            id: `var-${Date.now()}-${i}`,
            headline: v.headline.toUpperCase(),
            headlineHighlight: hlWords,
            highlightWords: hlWords,
            highlightStyle: style.highlightStyle,
            subtext: '',
            cta: v.cta.toUpperCase(),
            caption: v.caption,
            angle: mappedAngle,
            imagePrompt: framePrompts.get(v.frameId) || '',
            shape: shapeMap[v.angle] || style.shape,
            imageOpacity: opacityMap[v.angle] || style.defaultOpacity,
            fontFamily: style.fontFamily,
            viralLogic: `Brief estruturado · Frame ${v.frameId} · ${v.angle}`,
          } as CreativeVariation;
        });

        // Add 3 graphic-pattern-only variations (no image needed)
        const patternVariations = createPatternVariations(structuredBrief, newVariations.length);
        newVariations.push(...patternVariations);

        setVariations(newVariations);
        setBatchProgress({ current: newVariations.length, total: newVariations.length });

        toast({
          title: `🎯 ${newVariations.length} variações criadas do brief estruturado!`,
          description: `${structuredBrief.variations.length} do TXT + ${patternVariations.length} padrões gráficos. ${structuredBrief.frames.length} frames de imagem detectados.`,
        });

      } else if (hasReference) {
        // ─── REFERENCE MODE: Use dedicated analyze-reference function ───
        setBatchProgress({ current: 0, total: targetVariationCount });

        const { data, error } = await supabase.functions.invoke('analyze-reference', {
          body: {
            referenceText: referenceData.text,
            referenceImageUrl: referenceData.imageUrl,
            count: targetVariationCount,
            angles: anglesPool,
            channel: selectedChannel,
            objective: selectedObjective,
            persona: isGeneralPersona
              ? 'Prestadores de serviço autônomos brasileiros em geral (eletricistas, encanadores, pintores, faxineiras, etc.)'
              : persona.persona,
            styles: VISUAL_STYLES.map(s => ({ label: s.label, racional: s.racional })),
          },
        });

        if (error) throw error;
        if (!data?.success || !data?.result?.variations?.length) {
          throw new Error(data?.error || 'Nenhuma variação retornada');
        }

        const aiVariations = data.result.variations;
        const newVariations: CreativeVariation[] = aiVariations.map((v: any, i: number) => {
          const style = VISUAL_STYLES[i % VISUAL_STYLES.length];
          const rawHighlight = v.highlightWords ? String(v.highlightWords) : '';
          const aiHighlight = rawHighlight.includes('|')
            ? rawHighlight
            : rawHighlight.split(/\s+/).filter((w: string) => w.length >= 4).slice(0, 3).join('|')
              || String(v.headline || '').split(' ').filter((w: string) => w.length >= 5).slice(0, 2).join('|');
          const aiOpacity = typeof v.suggestedOpacity === 'number'
            ? Math.max(0, Math.min(1, v.suggestedOpacity))
            : style.defaultOpacity;
          const validShapes = ['none', 'pill', 'box', 'diagonal', 'gradient-bar', 'circle-accent'];
          const aiShape = validShapes.includes(v.suggestedShape) ? v.suggestedShape : style.shape;

          return {
            id: `var-${Date.now()}-${i}`,
            headline: String(v.headline || '').toUpperCase(),
            headlineHighlight: aiHighlight,
            highlightWords: aiHighlight,
            highlightStyle: style.highlightStyle,
            subtext: String(v.body || v.cta || ''),
            cta: String(v.cta || ''),
            caption: String(v.caption || ''),
            angle: String(v.angle || anglesPool[i % anglesPool.length]),
            imagePrompt: String(v.imagePrompt || ''),
            shape: aiShape,
            imageOpacity: aiOpacity,
            fontFamily: style.fontFamily,
            viralLogic: String(v.viralLogic || ''),
          } as CreativeVariation;
        });

        setVariations(newVariations);
        setBatchProgress({ current: targetVariationCount, total: targetVariationCount });

        toast({
          title: `🎯 ${newVariations.length} variações criadas!`,
          description: `Análise: "${data.result.analysis?.theme || 'referência processada'}" — todas as copies baseadas na sua referência.`,
        });

      } else {
        // ─── STANDARD MODE: Use generate-carousel (no reference) ───
        const newVariations: CreativeVariation[] = [];
        const BATCH_SIZE = 3;
        const allConfigs: { index: number; style: typeof VISUAL_STYLES[0]; angle: string; nicho: string; context: string }[] = [];

        for (let i = 0; i < targetVariationCount; i++) {
          const varStyle = VISUAL_STYLES[i % VISUAL_STYLES.length];
          const varAngle = anglesPool[i % anglesPool.length];
          const varNicho = isGeneralPersona ? 'Prestador Geral' : (selectedNichos[i % selectedNichos.length] || selectedNichos[0]);

          let varContext = buildFullContext();
          varContext += `\n\nVARIAÇÃO ${i + 1} de ${targetVariationCount}: Ângulo "${varAngle}"${isGeneralPersona ? '' : `, Nicho "${varNicho}"`}.`;
          varContext += `\nESTILO VISUAL: "${varStyle.label}" — ${varStyle.racional}`;
          varContext += `\nCrie uma abordagem RADICALMENTE DIFERENTE das outras variações.`;
          varContext += `\nMODO OBRIGATÓRIO: CRIATIVO ESTÁTICO ÚNICO (NÃO CARROSSEL).`;
          varContext += `\nNo slide 1, entregue uma headline + body + CTA coerentes entre si.`;
          if (isGeneralPersona) {
            varContext += `\nO público são prestadores de serviço autônomos brasileiros EM GERAL. Use linguagem que fale com TODOS os ofícios.`;
            varContext += `\nEsta é uma bateria de teste A/B. Cada variação deve ter approach de copy DIFERENTE.`;
          }
          allConfigs.push({ index: i, style: varStyle, angle: varAngle, nicho: varNicho, context: varContext });
        }

        setBatchProgress({ current: 0, total: targetVariationCount });

        for (let batch = 0; batch < allConfigs.length; batch += BATCH_SIZE) {
          const chunk = allConfigs.slice(batch, batch + BATCH_SIZE);
          const batchVariations: CreativeVariation[] = [];
          const results = await Promise.allSettled(
            chunk.map(cfg =>
              supabase.functions.invoke('generate-carousel', {
                body: {
                  persona: isGeneralPersona ? 'Prestador de Serviço Geral' : cfg.nicho,
                  angle: cfg.angle,
                  channel: selectedChannel,
                  format: 'Post Estático',
                  objective: selectedObjective,
                  personaData: {
                    profile: persona.profile,
                    painPoints: persona.painPoints,
                    hooks: persona.hooks,
                    approach: persona.approach,
                    ageRange: persona.ageRange,
                    avgRate: persona.avgRate,
                  },
                  additionalContext: cfg.context,
                },
              }).then(res => ({ cfg, data: res.data, error: res.error }))
            )
          );

          for (const r of results) {
            if (r.status === 'fulfilled' && r.value.data?.carousel) {
              const c = r.value.data.carousel;
              const cfg = r.value.cfg;
              const primarySlide = c.slides?.[0] || {};

              const headlineText = String(primarySlide.headline || c.title || 'HEADLINE').toUpperCase();
              const stopWords = ['VOCÊ', 'QUE', 'COM', 'SEM', 'POR', 'DOS', 'DAS', 'NOS', 'NAS', 'PARA', 'COMO', 'UMA', 'MAIS', 'SEUS', 'SUAS', 'ESSE', 'ESSA', 'ESTE', 'ESTA'];
              const autoHighlight = headlineText.split(/\s+/)
                .filter(w => w.length >= 4 && !stopWords.includes(w))
                .sort((a, b) => b.length - a.length)
                .slice(0, 2)
                .join('|');

              const variation: CreativeVariation = {
                id: `var-${Date.now()}-${cfg.index}`,
                headline: headlineText,
                headlineHighlight: autoHighlight,
                highlightWords: autoHighlight,
                highlightStyle: cfg.style.highlightStyle || 'color',
                subtext: String(primarySlide.body || c.subtitle || ''),
                cta: String(primarySlide.cta || 'SAIBA MAIS'),
                caption: String(c.caption || ''),
                angle: cfg.angle,
                imagePrompt: String(primarySlide.visual || ''),
                shape: cfg.style.shape,
                imageOpacity: cfg.style.defaultOpacity,
                fontFamily: cfg.style.fontFamily,
                viralLogic: c.viralLogic,
              };

              newVariations.push(variation);
              batchVariations.push(variation);
            }
          }

          setBatchProgress({ current: Math.min(batch + BATCH_SIZE, targetVariationCount), total: targetVariationCount });
          if (batchVariations.length > 0) {
            setVariations(prev => [...prev, ...batchVariations]);
          }
        }

        toast({
          title: `🎯 ${newVariations.length} variações criadas!`,
          description: 'Bateria de teste gerada com estilos distintos.',
        });
      }

      setActiveTab('variations');
    } catch (e) {
      toast({ title: 'Erro ao gerar variações', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };

  // Create pattern-only variations (no image, graphic backgrounds)
  const createPatternVariations = (
    brief: NonNullable<ReturnType<typeof parseStructuredBrief>>,
    startIndex: number,
  ): CreativeVariation[] => {
    const brandColor = '#00A7B5'; // Turquesa DQEF
    const patterns: { name: string; shape: ShapeStyle; font: string; highlight: HighlightStyle; opacity: number }[] = [
      { name: 'Gradiente Bold', shape: 'gradient-bar', font: 'Bebas Neue', highlight: 'box', opacity: 0 },
      { name: 'Diagonal Limpo', shape: 'diagonal', font: 'Anton', highlight: 'color', opacity: 0 },
      { name: 'Minimalista Marca', shape: 'none', font: 'Oswald', highlight: 'bold', opacity: 0 },
    ];

    // Pick 3 best copies from the brief
    const picks = brief.variations.length >= 3
      ? [brief.variations[0], brief.variations[Math.floor(brief.variations.length / 2)], brief.variations[brief.variations.length - 1]]
      : brief.variations.slice(0, 3);

    return patterns.map((p, i) => {
      const src = picks[i] || picks[0];
      const headline = src.headline.toUpperCase();
      const stopWords = ['VOCÊ', 'QUE', 'COM', 'SEM', 'POR', 'AINDA', 'MAIS', 'PARA', 'COMO', 'TODO', 'TODA'];
      const hlWords = headline.split(/\s+/)
        .filter(w => w.length >= 4 && !stopWords.includes(w))
        .sort((a, b) => b.length - a.length)
        .slice(0, 2)
        .join('|');

      return {
        id: `var-${Date.now()}-pat-${i}`,
        headline,
        headlineHighlight: hlWords,
        highlightWords: hlWords,
        highlightStyle: p.highlight,
        subtext: '',
        cta: src.cta.toUpperCase(),
        caption: src.caption,
        angle: `Padrão ${p.name}`,
        imagePrompt: '', // No image — pure graphic
        imageUrl: undefined,
        shape: p.shape,
        imageOpacity: 0,
        fontFamily: p.font,
        highlightColor: brandColor,
        viralLogic: `Variação sem imagem: ${p.name} — teste de copy pura com padrão gráfico`,
      } as CreativeVariation;
    });
  };

  // Variation image gen + save to library
  const handleVariationImage = async (variationId: string, prompt: string) => {
    if (!user) return;
    setGeneratingVariation(variationId);
    try {
      const fullPrompt = `Professional marketing social media ad. ${prompt}. Clean, modern, high quality. Aspect ratio ${selectedFormat.ratio}. Show diverse Brazilian workers in professional, dignified settings. NO favelas, NO poverty imagery, NO racial stereotypes.`;
      const response = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt: fullPrompt, quality: 'fast' },
      });
      if (response.data?.imageUrl) {
        setVariations(prev => prev.map(v =>
          v.id === variationId ? { ...v, imageUrl: response.data.imageUrl } : v
        ));
        // Save to media library with categorization
        saveImageToLibrary(response.data.imageUrl, prompt);
        toast({ title: 'Imagem gerada!' });
      }
    } catch {
      toast({ title: 'Erro ao gerar imagem', variant: 'destructive' });
    } finally {
      setGeneratingVariation(null);
    }
  };

  // Helper: save generated image to media_library and trigger categorization
  const saveImageToLibrary = async (imageUrl: string, context: string) => {
    if (!user) return;
    try {
      const filename = `ai-gen-${Date.now()}.png`;
      const { data: insertData, error } = await supabase.from('media_library').insert({
        user_id: user.id,
        url: imageUrl,
        filename,
        description: context.slice(0, 100),
      } as any).select('id').single();
      
      if (!error && insertData?.id) {
        // Trigger async categorization
        supabase.functions.invoke('categorize-media', {
          body: { imageUrl, mediaId: insertData.id },
        }).catch(() => {}); // fire-and-forget
      }
    } catch {
      // Non-critical — don't block the user
    }
  };

  // ─── Search Library Before Generating ─────────────────────────────────────
  const [searchingLibrary, setSearchingLibrary] = useState(false);
  const [librarySearchProgress, setLibrarySearchProgress] = useState<{ current: number; total: number; matches: number } | null>(null);

  const handleSearchLibrary = async () => {
    const withoutImage = variations.filter(v => !v.imageUrl);
    if (withoutImage.length === 0) {
      toast({ title: 'Todas as variações já têm imagem' });
      return;
    }
    if (!user) return;

    setSearchingLibrary(true);
    setLibrarySearchProgress({ current: 0, total: withoutImage.length, matches: 0 });
    let matches = 0;
    const BATCH = 3;

    for (let i = 0; i < withoutImage.length; i += BATCH) {
      const chunk = withoutImage.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map(v =>
          supabase.functions.invoke('suggest-media', {
            body: {
              headline: v.headline,
              subtext: v.subtext,
              imagePrompt: v.imagePrompt,
              angle: v.angle,
              userId: user.id,
            },
          })
        )
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value.data?.suggestions?.length) {
          const top = r.value.data.suggestions[0];
          if (top.score >= 7) {
            const vid = chunk[idx].id;
            setVariations(prev => prev.map(v => v.id === vid ? { ...v, imageUrl: top.url } : v));
            matches++;
          }
        }
      });
      setLibrarySearchProgress({ current: Math.min(i + chunk.length, withoutImage.length), total: withoutImage.length, matches });
    }

    setSearchingLibrary(false);
    setLibrarySearchProgress(null);
    const remaining = withoutImage.length - matches;
    toast({
      title: `📚 ${matches} imagens encontradas na biblioteca!`,
      description: remaining > 0 ? `${remaining} variações sem match — use "Gerar Todas Imagens IA" para completar.` : 'Todas as variações preenchidas!',
    });
  };

  // Generate ALL variation images in batch

  const handleGenerateAllImages = async () => {
    const withoutImage = variations.filter(v => !v.imageUrl && v.imagePrompt);
    if (withoutImage.length === 0) {
      toast({ title: 'Todas as variações já têm imagem', description: 'Remova imagens existentes para regenerar.' });
      return;
    }
    setGeneratingAllImages(true);
    setImageGenProgress({ current: 0, total: withoutImage.length });
    const BATCH = 2;
    let done = 0;

    for (let i = 0; i < withoutImage.length; i += BATCH) {
      const chunk = withoutImage.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map(v =>
          supabase.functions.invoke('generate-slide-image', {
            body: { imagePrompt: v.imagePrompt, quality: 'fast' },
          })
        )
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value.data?.imageUrl) {
          const vid = chunk[idx].id;
          const imgUrl = r.value.data.imageUrl;
          setVariations(prev => prev.map(v => v.id === vid ? { ...v, imageUrl: imgUrl } : v));
          // Save to library with categorization
          saveImageToLibrary(imgUrl, chunk[idx].imagePrompt || chunk[idx].headline);
        }
      });
      done += chunk.length;
      setImageGenProgress({ current: done, total: withoutImage.length });
    }

    setGeneratingAllImages(false);
    setImageGenProgress(null);
    toast({ title: `🎨 ${withoutImage.length} imagens geradas!` });
  };

  // Export all variations
  const handleExportAll = () => {
    toast({ title: '📦 Exportação em lote', description: 'Use o botão PNG em cada variação para exportar individualmente.' });
  };

  const handleCopyCaption = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    toast({ title: 'Caption copiado!' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPostImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleExportPNG = async () => {
    if (!exportRef.current) return;
    try {
      exportRef.current.style.display = 'block';
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 1, width: selectedFormat.width, height: selectedFormat.height, skipFonts: true, cacheBust: true });
      exportRef.current.style.display = 'none';
      const link = document.createElement('a');
      link.download = `DQEF-${selectedFormat.label.replace(/\s/g, '-')}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'PNG exportado!', description: `${selectedFormat.width}×${selectedFormat.height}` });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
      if (exportRef.current) exportRef.current.style.display = 'none';
    }
  };

  const handleGenerateImage = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const prompt = imagePromptText || result?.visualDirection || editableSubtext || 'Professional marketing image';
      const fullPrompt = `Professional marketing social media post image. ${prompt}. Clean, modern, high quality. Aspect ratio ${selectedFormat.ratio}. Show diverse Brazilian workers in professional, dignified settings. NO favelas, NO poverty imagery, NO racial stereotypes.`;
      const response = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt: fullPrompt, quality: 'fast' },
      });
      if (response.data?.imageUrl) {
        setPostImageUrl(response.data.imageUrl);
        saveImageToLibrary(response.data.imageUrl, prompt);
        toast({ title: 'Imagem gerada!' });
      }
    } catch {
      toast({ title: 'Erro ao gerar imagem', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-black text-foreground">AI Criativo Pro</h2>
          <p className="text-xs text-muted-foreground">Artes estáticas com benchmark, variações e shapes para testes rápidos</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={savingDraft} className="h-8 text-xs gap-1.5">
            {savingDraft ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar Rascunho
          </Button>
          <Button size="sm" variant={showCanvas ? 'default' : 'outline'} onClick={() => setShowCanvas(c => !c)} className="h-8 text-xs gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Canvas
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="single" className="text-xs gap-1.5"><Wand2 className="h-3.5 w-3.5" /> Arte Única</TabsTrigger>
          <TabsTrigger value="variations" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Variações
            {variations.length > 0 && <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] ml-1">{variations.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="drafts" className="text-xs gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> Rascunhos
            {drafts.length > 0 && <Badge className="bg-muted text-muted-foreground border-border text-[9px] ml-1">{drafts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ─── SINGLE ──────────────────────────────────────────────────── */}
        <TabsContent value="single">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.4fr]">
            {/* LEFT — Config Panel */}
            <div className="space-y-3">
              <CampaignKnowledgeSelector onContextChange={setCampaignContext} />

              {/* Strategy Context */}
              <StrategyContextPanel onContextChange={(ctx) => setStrategyContext(ctx.combined)} userId={user?.id || null} />

              {/* Benchmark */}
              <BenchmarkPanel userId={user?.id || null} onSelectBenchmark={setSelectedBenchmark} selectedBenchmark={selectedBenchmark} />

              {/* Data Science */}
              <DataSciencePanel userId={user?.id || null} onInsightsChange={setDataScienceContext} />

              {/* Reference Upload */}
              <ReferenceUploadPanel onReferenceChange={(ref) => {
                setReferenceData(ref);
                setCopyReference(ref.text);
                if (ref.imageUrl) setReferenceImages(prev => [...prev, ref.imageUrl!]);
              }} />

              {/* Estilos Visuais A/B */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Estilo Visual</span>
                  <Badge variant="outline" className="text-[9px] h-4">A/B Test</Badge>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {VISUAL_STYLES.map(style => (
                    <button key={style.id} onClick={() => applyVisualStyle(style.id)}
                      className={cn('rounded-lg border p-2 text-center transition-all duration-200',
                        selectedVisualStyle === style.id ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:border-primary/40')}>
                      <div className="flex justify-center gap-0.5 mb-1.5">
                        {[style.colors.bg, style.colors.accent, style.colors.text].map((c, i) => (
                          <div key={i} className="h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-foreground leading-tight">{style.label}</p>
                      <p className="text-[8px] text-muted-foreground">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nichos — hidden when Geral persona is selected */}
              {selectedPersona !== 'est-000' && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <NichoPicker selected={selectedNichos} onChange={setSelectedNichos} />
                </div>
              )}

              {/* Persona */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Persona Alvo</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {initialEstrategias.map(est => (
                    <button key={est.id} onClick={() => setSelectedPersona(est.id)}
                      className={cn('rounded-lg border p-2.5 text-left transition-all duration-200',
                        selectedPersona === est.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}>
                      <span className="text-lg">{est.icon}</span>
                      <p className="mt-1 text-xs font-bold text-foreground leading-tight">{est.persona}</p>
                      <p className="text-[10px] text-muted-foreground">{est.ageRange}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ângulo */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Ângulo Emocional</span>
                </div>
                <div className="space-y-1.5">
                  {ANGLES.map(a => {
                    const Icon = a.icon;
                    return (
                      <button key={a.id} onClick={() => setSelectedAngle(a.id)}
                        className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200',
                          selectedAngle === a.id ? a.bg : 'border-border hover:border-primary/30')}>
                        <Icon className={cn('h-4 w-4 shrink-0', selectedAngle === a.id ? a.color : 'text-muted-foreground')} />
                        <div>
                          <p className={cn('text-xs font-bold', selectedAngle === a.id ? a.color : 'text-foreground')}>{a.label}</p>
                          <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Canal + Objetivo */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Canal</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CHANNELS.map(ch => (
                      <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
                        className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-all',
                          selectedChannel === ch.id ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                        {ch.label}{ch.sub ? ` ${ch.sub}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Objetivo</p>
                  <div className="flex flex-wrap gap-1.5">
                    {OBJECTIVES.map(o => (
                      <button key={o} onClick={() => setSelectedObjective(o)}
                        className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-all',
                          selectedObjective === o ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image Prompt */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">🎨 Prompt de Imagem</p>
                <Textarea placeholder="Ex: prestador de serviço sorrindo, uniforme profissional, fundo de obra limpa..."
                  value={imagePromptText} onChange={e => setImagePromptText(e.target.value)}
                  className="min-h-[60px] bg-background border-border text-xs resize-none" />
              </div>

              {/* Context */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Contexto / Copy</p>
                <Textarea placeholder="Ex: focar no nicho de piscineiros, incluir dado sobre GetNinjas..."
                  value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                  className="min-h-[80px] bg-background border-border text-xs resize-none" />
              </div>

              {/* Generate buttons */}
              <div className="space-y-2">
                {/* Arte Única — reference-aware */}
                <Button onClick={handleGenerate} disabled={loading} className={cn("w-full gap-2 font-bold", (referenceData.text || referenceData.imageUrl) && "ring-2 ring-primary/30")} size="lg">
                  {loading && !batchProgress
                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando...</>
                    : <><Sparkles className="h-4 w-4" /> {referenceData.text || referenceData.imageUrl ? '🎯 Gerar Arte da Referência' : 'Gerar Arte Única'}</>}
                </Button>

                {/* IA Completa — Nano Banana Pro, no template */}
                <Button onClick={handleGenerateFullArt} disabled={loading} variant="outline" className="w-full gap-2 font-bold border-primary/40 hover:bg-primary/10" size="lg">
                  {loading && !batchProgress
                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando imagem completa...</>
                    : <><ImageIcon className="h-4 w-4" /> 🎨 IA Completa (Nano Banana Pro)</>}
                </Button>
                <p className="text-[9px] text-muted-foreground text-center -mt-1">Gera imagem de fundo baseada na referência — textos editáveis sobre a arte</p>

                <Button
                  onClick={() => {
                    // Use the current single art as reference for 15 variations
                    if (editableHeadline && showCanvas) {
                      const artRef = `HEADLINE: ${editableHeadline}\nBODY: ${editableSubtext}\nCTA: ${result?.caption || ''}\nÂNGULO: ${selectedAngle}`;
                      setReferenceData(prev => ({ ...prev, text: artRef }));
                      setTimeout(() => {
                        setVariationCount(15);
                        handleGenerateVariations(15);
                      }, 100);
                    } else {
                      toast({ title: 'Crie uma arte única primeiro', description: 'Use "Gerar Arte Única" antes de escalar.', variant: 'destructive' });
                    }
                  }}
                  disabled={loading || !showCanvas}
                  className="w-full gap-2 font-bold border-primary/40 hover:bg-primary/10"
                  variant="outline"
                  size="lg"
                >
                  <Layers className="h-4 w-4" />
                  🎨 Gerar 15 da Arte Única
                </Button>
                <p className="text-[9px] text-muted-foreground text-center -mt-1">Usa a headline/body da arte acima como referência</p>

                <Button
                  onClick={() => {
                    setVariationCount(15);
                    handleGenerateVariations(15);
                  }}
                  disabled={loading}
                  className={cn(
                    "w-full gap-2 font-bold",
                    referenceData.text || referenceData.imageUrl ? "bg-primary ring-2 ring-primary/30" : ""
                  )}
                  variant="default"
                  size="lg"
                >
                  <Layers className="h-4 w-4" />
                  {referenceData.text || referenceData.imageUrl
                    ? '🎯 Gerar 15 da Referência Inputada'
                    : 'Gerar 15 dos Inputs Configurados'}
                </Button>

                <div className="flex gap-2">
                  <div className="flex gap-1 flex-1">
                    {VARIATION_COUNT_OPTIONS.map(n => (
                      <button key={n} onClick={() => setVariationCount(n)}
                        className={cn('flex-1 rounded-lg border py-1.5 text-xs font-bold transition-all',
                          variationCount === n ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground',
                          n === 15 && 'ring-1 ring-primary/20')}>
                        {n}×
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => handleGenerateVariations()} disabled={loading} variant="outline" className="gap-1.5 font-bold">
                    <Layers className="h-4 w-4" /> Gerar {variationCount} Variações
                  </Button>
                </div>

                {/* Batch progress */}
                {batchProgress && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
                        <span className="text-xs font-bold text-foreground">Gerando em escala...</span>
                      </div>
                      <span className="text-xs font-mono text-primary">{batchProgress.current}/{batchProgress.total}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {batchProgress.current < batchProgress.total
                        ? `Processando lote ${Math.ceil(batchProgress.current / 3)} de ${Math.ceil(batchProgress.total / 3)}...`
                        : 'Finalizando...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Canvas + Result */}
            <div className="space-y-4">
              {showCanvas ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Preview · {selectedFormat.label} ({selectedFormat.width}×{selectedFormat.height})
                        </p>
                        <div className="flex gap-1.5">
                          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => imageInputRef.current?.click()}>
                            <Upload className="h-3 w-3 mr-1" /> Upload
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={handleGenerateImage} disabled={loading}>
                            <ImageIcon className="h-3 w-3 mr-1" /> Gerar IA
                          </Button>
                          <Button size="sm" className="h-7 text-[10px]" onClick={handleExportPNG}>
                            <Download className="h-3 w-3 mr-1" /> PNG
                          </Button>
                        </div>
                      </div>

                      <div className="max-w-[400px] mx-auto">
                        <StaticPostPreview
                          headline={editableHeadline}
                          headlineHighlight={headlineHighlight}
                          highlightStyle={selectedHighlightStyle}
                          subtext={editableSubtext}
                          imageUrl={postImageUrl || undefined}
                          format={selectedFormat}
                          theme={selectedTheme}
                          textScale={textScale}
                          headlineScale={headlineScale}
                          imageOpacity={imageOpacity}
                          imageScale={imageScale}
                          imageOffsetY={imageOffsetY}
                          shape={selectedShape}
                          fontFamily={selectedFont}
                          textPositionX={textPositionX}
                          textPositionY={textPositionY}
                        />
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Headline</p>
                          <Textarea value={editableHeadline} onChange={e => setEditableHeadline(e.target.value)}
                            className="min-h-[50px] text-xs bg-background border-border" />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Subtexto</p>
                            <Textarea value={editableSubtext} onChange={e => setEditableSubtext(e.target.value)}
                              className="min-h-[40px] text-xs bg-background border-border" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">✨ Destaque de Palavras</p>
                            <p className="text-[9px] text-muted-foreground">Clique nas palavras para destacar (múltipla seleção):</p>
                            <div className="flex flex-wrap gap-1">
                              {editableHeadline.split(/\s+/).filter(w => w.length > 1).map((word, i) => {
                                const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ0-9%$,]/g, '');
                                if (!cleanWord) return null;
                                const selectedWords = headlineHighlight ? headlineHighlight.split('|').map(w => w.trim()).filter(Boolean) : [];
                                const isSelected = selectedWords.some(sw => sw.toLowerCase() === cleanWord.toLowerCase());
                                return (
                                  <button key={`${cleanWord}-${i}`}
                                    onClick={() => {
                                      const current = headlineHighlight ? headlineHighlight.split('|').map(w => w.trim()).filter(Boolean) : [];
                                      const exists = current.some(w => w.toLowerCase() === cleanWord.toLowerCase());
                                      const next = exists
                                        ? current.filter(w => w.toLowerCase() !== cleanWord.toLowerCase())
                                        : [...current, cleanWord];
                                      setHeadlineHighlight(next.join('|'));
                                    }}
                                    className={cn(
                                      'text-[10px] px-2.5 py-1 rounded-md border-2 transition-all font-bold uppercase tracking-wide',
                                      isSelected
                                        ? 'bg-primary/20 text-primary border-primary shadow-sm shadow-primary/30'
                                        : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'
                                    )}>
                                    {cleanWord}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Estilo do destaque:</p>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { id: 'none' as HighlightStyle, label: 'Nenhum', icon: '—', desc: 'Sem destaque' },
                                { id: 'color' as HighlightStyle, label: 'Cor', icon: '✨', desc: 'Palavra em cor diferente' },
                                { id: 'bold' as HighlightStyle, label: 'Bold+', icon: 'B', desc: 'Bold com stroke e cor' },
                                { id: 'box' as HighlightStyle, label: 'Caixa', icon: '▮', desc: 'Fundo colorido no texto' },
                              ].map(s => (
                                <button key={s.id} onClick={() => setSelectedHighlightStyle(s.id)}
                                  className={cn(
                                    'rounded-lg border-2 p-1.5 text-center transition-all',
                                    selectedHighlightStyle === s.id
                                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                      : 'border-border hover:border-primary/40'
                                  )}>
                                  <div className="text-sm font-black leading-none mb-0.5">{s.icon}</div>
                                  <p className="text-[8px] font-bold text-foreground">{s.label}</p>
                                  <p className="text-[7px] text-muted-foreground leading-tight">{s.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar controls */}
                    <div className="w-full lg:w-[260px] space-y-4">
                      <ThemePicker selected={selectedThemeId} onChange={setSelectedThemeId} />
                      <ShapePicker selected={selectedShape} onChange={setSelectedShape} />
                      <FormatPicker selected={selectedFormatId} onChange={setSelectedFormatId} />

                      {/* Font Picker */}
                      <div>
                        <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">FONTE</p>
                        <div className="grid grid-cols-2 gap-1">
                          {FONT_OPTIONS.map(f => (
                            <button key={f.id} onClick={() => setSelectedFont(f.id)}
                              className={cn('rounded-lg border px-2 py-1.5 text-left transition-all',
                                selectedFont === f.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}>
                              <span className="text-[10px] font-bold" style={{ fontFamily: `${f.id}, sans-serif` }}>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground tracking-widest">AJUSTES</p>
                        <AdjSlider label="Escala Texto" value={textScale} min={0.5} max={2} step={0.1} onValueChange={setTextScale} />
                        <AdjSlider label="Headline" value={headlineScale} min={0.5} max={3} step={0.1} onValueChange={setHeadlineScale} />
                        <AdjSlider label="Posição X" value={textPositionX} min={2} max={80} step={1} display={`${textPositionX}%`} onValueChange={setTextPositionX} />
                        <AdjSlider label="Posição Y" value={textPositionY} min={15} max={98} step={1} display={`${textPositionY}%`} onValueChange={setTextPositionY} />
                        {postImageUrl && (
                          <>
                            <AdjSlider label="Opacidade" value={imageOpacity} min={0} max={1} step={0.05} onValueChange={setImageOpacity} />
                            <AdjSlider label="Zoom" value={imageScale} min={0.5} max={3} step={0.1} onValueChange={setImageScale} />
                            <AdjSlider label="Offset Y" value={imageOffsetY} min={-50} max={50} step={1} display={`${imageOffsetY}%`} onValueChange={setImageOffsetY} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Export hidden */}
                  <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <div ref={exportRef} style={{ display: 'none' }}>
                      <StaticPostPreview
                        headline={editableHeadline}
                        headlineHighlight={headlineHighlight}
                        highlightStyle={selectedHighlightStyle}
                        subtext={editableSubtext}
                        imageUrl={postImageUrl || undefined}
                        format={selectedFormat}
                        exportMode
                        theme={selectedTheme}
                        textScale={textScale}
                        headlineScale={headlineScale}
                        imageOpacity={imageOpacity}
                        imageScale={imageScale}
                        imageOffsetY={imageOffsetY}
                        shape={selectedShape}
                        fontFamily={selectedFont}
                        textPositionX={textPositionX}
                        textPositionY={textPositionY}
                      />
                    </div>
                  </div>

                  {/* Result metadata */}
                  {result && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">{persona.icon} {persona.persona}</Badge>
                              <Badge variant="outline" className="text-[10px]">{selectedChannel}</Badge>
                              <Badge variant="outline" className="text-[10px] font-mono">{selectedFormat.width}×{selectedFormat.height}</Badge>
                              {selectedNichos.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">🎯 {selectedNichos.join(', ')}</Badge>
                              )}
                            </div>
                            <h3 className="text-base font-black text-foreground leading-tight">{result.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{result.subtitle}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading} className="shrink-0 gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" /> Regerar
                          </Button>
                        </div>
                        <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Por que vai funcionar</span>
                          </div>
                          <p className="text-xs text-foreground">{result.viralLogic}</p>
                        </div>
                      </div>

                      {/* Caption */}
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Caption</p>
                          <Button size="sm" variant="ghost" onClick={handleCopyCaption}
                            className={cn('h-7 gap-1.5 text-xs', copiedCaption ? 'text-green-400' : 'text-muted-foreground')}>
                            {copiedCaption ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedCaption ? 'Copiado!' : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed">{result.caption}</pre>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border bg-card p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">⏰ Melhor horário</p>
                          <p className="text-xs text-foreground">{result.bestTime}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">💡 Dica de engajamento</p>
                          <p className="text-xs text-foreground">{result.engagementTip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center p-8">
                  <Palette className="h-10 w-10 text-muted-foreground/40 mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">Canvas de Arte Estática</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Clique em "Canvas" ou gere com IA para começar.
                  </p>
                </div>
              )}

              {loading && !showCanvas && (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-center p-8">
                  <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
                  <p className="text-sm font-bold text-foreground">Criando arte...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    IA analisando {persona.persona} × {selectedAngle} × {selectedChannel}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── VARIATIONS ──────────────────────────────────────────────── */}
        <TabsContent value="variations">
          <VariationsGrid
            variations={variations}
            onRemove={(id) => setVariations(prev => prev.filter(v => v.id !== id))}
            onUpdateVariation={(id, updates) => setVariations(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))}
            onGenerateImage={handleVariationImage}
            onGenerateAllImages={handleGenerateAllImages}
            onSearchLibrary={handleSearchLibrary}
            isSearchingLibrary={searchingLibrary}
            librarySearchProgress={librarySearchProgress}
            isGeneratingAllImages={generatingAllImages}
            imageGenProgress={imageGenProgress}
            onExportAll={handleExportAll}
            format={selectedFormat}
            theme={selectedTheme}
            isGeneratingImage={generatingVariation}
          />
        </TabsContent>

        {/* ─── DRAFTS ──────────────────────────────────────────────────── */}
        <TabsContent value="drafts">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">{drafts.length} Rascunhos Salvos</span>
              </div>
              <Button size="sm" variant="outline" onClick={fetchDrafts} disabled={loadingDrafts} className="h-7 text-[10px] gap-1.5">
                <RefreshCw className={cn("h-3 w-3", loadingDrafts && "animate-spin")} /> Atualizar
              </Button>
            </div>

            {loadingDrafts ? (
              <div className="text-center py-10 text-muted-foreground text-xs">Carregando rascunhos...</div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center min-h-[200px]">
                <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-xs font-bold text-muted-foreground">Nenhum rascunho salvo</p>
                <p className="text-[10px] text-muted-foreground mt-1">Crie uma arte e clique em "Salvar Rascunho"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {drafts.map(draft => (
                  <div key={draft.id} className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/40 transition-all">
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono text-primary">{draft.sigla}</p>
                          <p className="text-xs font-bold text-foreground truncate mt-0.5">{draft.name}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {draft.status === 'draft' ? 'Rascunho' : draft.status === 'review' ? 'Em Revisão' : draft.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <Badge className="bg-muted text-muted-foreground border-border text-[8px]">{draft.angle}</Badge>
                        <Badge className="bg-muted text-muted-foreground border-border text-[8px]">{draft.channel}</Badge>
                        <Badge className="bg-muted text-muted-foreground border-border text-[8px]">{draft.shape}</Badge>
                        {draft.variations.length > 0 && (
                          <Badge className="bg-primary/10 text-primary border-primary/30 text-[8px]">{draft.variations.length} variações</Badge>
                        )}
                      </div>

                      {draft.caption && (
                        <p className="text-[9px] text-muted-foreground line-clamp-2">{draft.caption.slice(0, 120)}...</p>
                      )}

                      <p className="text-[8px] text-muted-foreground">
                        {new Date(draft.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>

                      <div className="flex gap-1.5 pt-1">
                        <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1 gap-1" onClick={() => handleLoadDraft(draft)}>
                          <FolderOpen className="h-2.5 w-2.5" /> Abrir
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[9px] text-destructive" onClick={() => handleDeleteDraft(draft.id)}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
