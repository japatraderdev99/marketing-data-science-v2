import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Wand2, Copy, Check, Download, ChevronDown, ChevronUp, ImageIcon, Video, Zap, RefreshCw, Image, Minimize2, Shuffle, Upload, Trash2, Library, X, Star, Target, FileText, Users, Megaphone, TrendingUp, BookOpen, AlertTriangle, PlusCircle, File, Eye, Save, MessageSquare, Clock, CheckCircle, XCircle, Send, BookMarked, Inbox, ShieldCheck, Loader2, Grid3x3, BookText, Search } from 'lucide-react';
import NarrativeSlideCard, { type PerSlideSettings, DEFAULT_SLIDE_SETTINGS, type SlideVerification } from '@/components/carousel/NarrativeSlideCard';
import NarrativeSlidePreview, { type NarrativeSlide, type NarrativeCarousel, type NarrativeThemeId, NARRATIVE_THEMES } from '@/components/carousel/NarrativeSlidePreview';
import CampaignKnowledgeSelector from '@/components/CampaignKnowledgeSelector';
import dqfIcon from '@/assets/dqf-icon.svg';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlideOutput {
  number: number;
  type: 'hook' | 'setup' | 'data' | 'contrast' | 'validation' | 'cta';
  headline: string;
  headlineHighlight?: string;
  subtext?: string;
  logic: string;
  visualDirection: string;
  needsMedia: boolean;
  mediaType?: 'photo' | 'video' | null;
  mediaDescription?: string | null;
  imagePrompt?: string | null;
  veoPrompt?: string | null;
  bgStyle: 'dark' | 'orange' | 'dark-red' | 'dark-green';
  layout: 'text-only' | 'text-photo-split' | 'number-dominant' | 'cta-clean';
}

interface CarouselOutput {
  title: string;
  angle: string;
  angleEmoji: string;
  angleRationale: string;
  targetProfile: string;
  channel: string;
  viralLogic: string;
  designNotes: string;
  bestTime: string;
  caption: string;
  slides: SlideOutput[];
}

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  tags: string[] | null;
  description: string | null;
  file_size: number | null;
  created_at: string;
}

interface MediaSuggestion extends MediaItem {
  score: number;
  reason: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANGLES = [
  { id: '', label: 'IA Decide', emoji: '🤖', color: 'border-primary/40 text-primary' },
  { id: 'RAIVA', label: 'Raiva', emoji: '🔴', color: 'border-red-500/40 text-red-400' },
  { id: 'DINHEIRO', label: 'Dinheiro', emoji: '💸', color: 'border-yellow-500/40 text-yellow-400' },
  { id: 'ORGULHO', label: 'Orgulho', emoji: '🏆', color: 'border-amber-500/40 text-amber-400' },
  { id: 'URGÊNCIA', label: 'Urgência', emoji: '⏰', color: 'border-orange-500/40 text-orange-400' },
  { id: 'ALÍVIO', label: 'Alívio', emoji: '💚', color: 'border-green-500/40 text-green-400' },
];

const PERSONAS = [
  'Piscineiro', 'Eletricista', 'Encanador', 'Marido de Aluguel',
  'Pedreiro', 'Pintor', 'Jardineiro', 'Faxineira',
];

const CHANNELS = ['Instagram Feed', 'Stories', 'TikTok', 'LinkedIn'];
const TONES = ['Peer-to-peer', 'Editorial', 'Direto ao ponto'];

// ─── Creative Formats with safe zones ────────────────────────────────────────
export interface CreativeFormat {
  id: string;
  label: string;
  platform: string;
  width: number;   // real export px
  height: number;  // real export px
  ratio: string;
  // Safe zone padding in px (at export resolution) to avoid UI chrome
  safeZone: { top: number; right: number; bottom: number; left: number };
  notes?: string;
}

export const CREATIVE_FORMATS: CreativeFormat[] = [
  // ── Instagram ──────────────────────────────────────────────────────────────
  {
    id: 'ig-feed-4x5',
    label: 'Feed 4:5',
    platform: 'Instagram',
    width: 1080, height: 1350, ratio: '4:5',
    safeZone: { top: 90, right: 90, bottom: 90, left: 90 },
    notes: 'Ocupa mais espaço no feed — maior impacto',
  },
  {
    id: 'ig-feed-3x4',
    label: 'Feed 3:4',
    platform: 'Instagram',
    width: 1080, height: 1440, ratio: '3:4',
    safeZone: { top: 90, right: 90, bottom: 90, left: 90 },
    notes: 'Formato vertical máximo para carrossel',
  },
  {
    id: 'ig-feed-1x1',
    label: 'Feed 1:1',
    platform: 'Instagram',
    width: 1080, height: 1080, ratio: '1:1',
    safeZone: { top: 90, right: 90, bottom: 90, left: 90 },
  },
  {
    id: 'ig-stories',
    label: 'Stories / Reels',
    platform: 'Instagram',
    width: 1080, height: 1920, ratio: '9:16',
    // Top 250px = status bar + profile; Bottom 350px = CTA strip + swipe-up zone
    safeZone: { top: 250, right: 90, bottom: 350, left: 90 },
    notes: 'Zona segura: evitar 250px topo e 350px base',
  },
  {
    id: 'ig-feed-landscape',
    label: 'Feed Paisagem',
    platform: 'Instagram',
    width: 1080, height: 566, ratio: '1.91:1',
    safeZone: { top: 60, right: 90, bottom: 60, left: 90 },
  },
  // ── TikTok ─────────────────────────────────────────────────────────────────
  {
    id: 'tiktok-vertical',
    label: 'TikTok Vertical',
    platform: 'TikTok',
    width: 1080, height: 1920, ratio: '9:16',
    // Top 200px = TikTok nav; Bottom 400px = actions + nav bar
    safeZone: { top: 200, right: 120, bottom: 400, left: 120 },
    notes: 'Evitar 200px topo e 400px base — botões de ação TikTok',
  },
  {
    id: 'tiktok-square',
    label: 'TikTok Quadrado',
    platform: 'TikTok',
    width: 1080, height: 1080, ratio: '1:1',
    safeZone: { top: 80, right: 80, bottom: 80, left: 80 },
  },
  // ── Facebook / Meta ────────────────────────────────────────────────────────
  {
    id: 'fb-feed-1x1',
    label: 'Facebook Feed',
    platform: 'Facebook',
    width: 1080, height: 1080, ratio: '1:1',
    safeZone: { top: 90, right: 90, bottom: 90, left: 90 },
  },
  {
    id: 'fb-stories',
    label: 'Facebook Stories',
    platform: 'Facebook',
    width: 1080, height: 1920, ratio: '9:16',
    safeZone: { top: 280, right: 90, bottom: 380, left: 90 },
    notes: 'Zona segura: 280px topo, 380px base',
  },
  // ── LinkedIn ───────────────────────────────────────────────────────────────
  {
    id: 'li-feed-1x1',
    label: 'LinkedIn Feed',
    platform: 'LinkedIn',
    width: 1200, height: 1200, ratio: '1:1',
    safeZone: { top: 100, right: 100, bottom: 100, left: 100 },
  },
  {
    id: 'li-landscape',
    label: 'LinkedIn Landscape',
    platform: 'LinkedIn',
    width: 1200, height: 628, ratio: '1.91:1',
    safeZone: { top: 60, right: 100, bottom: 60, left: 100 },
  },
  // ── Google Display ─────────────────────────────────────────────────────────
  {
    id: 'gd-medium-rect',
    label: 'Medium Rectangle',
    platform: 'Google Display',
    width: 300, height: 250, ratio: '6:5',
    safeZone: { top: 16, right: 16, bottom: 16, left: 16 },
    notes: 'Formato #1 em volume global',
  },
  {
    id: 'gd-leaderboard',
    label: 'Leaderboard',
    platform: 'Google Display',
    width: 728, height: 90, ratio: '8.09:1',
    safeZone: { top: 8, right: 16, bottom: 8, left: 16 },
    notes: 'Maior volume de impressões',
  },
  {
    id: 'gd-half-page',
    label: 'Half Page',
    platform: 'Google Display',
    width: 300, height: 600, ratio: '1:2',
    safeZone: { top: 24, right: 20, bottom: 24, left: 20 },
    notes: 'Impacto máximo — premium inventory',
  },
  {
    id: 'gd-responsive-land',
    label: 'Responsive 1.91:1',
    platform: 'Google Display',
    width: 1200, height: 628, ratio: '1.91:1',
    safeZone: { top: 60, right: 80, bottom: 60, left: 80 },
    notes: 'Google adapta para qualquer slot',
  },
  {
    id: 'gd-responsive-sq',
    label: 'Responsive 1:1',
    platform: 'Google Display',
    width: 1200, height: 1200, ratio: '1:1',
    safeZone: { top: 80, right: 80, bottom: 80, left: 80 },
  },
  // ── YouTube ────────────────────────────────────────────────────────────────
  {
    id: 'yt-thumbnail',
    label: 'YT Thumbnail',
    platform: 'YouTube',
    width: 1280, height: 720, ratio: '16:9',
    safeZone: { top: 60, right: 80, bottom: 60, left: 80 },
  },
  {
    id: 'yt-shorts',
    label: 'YouTube Shorts',
    platform: 'YouTube',
    width: 1080, height: 1920, ratio: '9:16',
    safeZone: { top: 220, right: 80, bottom: 420, left: 80 },
    notes: 'Evitar 220px topo e 420px base — interface YT',
  },
];

const SLIDE_BG = '#E8603C';

const BG_COLORS: Record<string, string> = {
  dark: SLIDE_BG,
  orange: SLIDE_BG,
  'dark-red': SLIDE_BG,
  'dark-green': SLIDE_BG,
};

// ─── Visual Themes ────────────────────────────────────────────────────────────

export type CarouselThemeId = 'brand-orange' | 'clean-white' | 'dark-premium';

export interface CarouselTheme {
  id: CarouselThemeId;
  label: string;
  description: string;
  bg: string;
  overlayGradient: string;
  headlineColor: string;
  subtextColor: string;
  highlightColor: string;
  highlightBgOnImage: string;
  sloganDim: string;
  sloganBright: string;
  iconFilter: string;
  previewBorder: string;
  previewSwatch: string[];
}

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: 'brand-orange',
    label: 'DQEF Original',
    description: 'Laranja icônico da marca',
    bg: '#E8603C',
    overlayGradient: 'linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.05) 100%)',
    headlineColor: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.75)',
    highlightColor: '#E8603C',
    highlightBgOnImage: 'rgba(255,255,255,0.22)',
    sloganDim: 'rgba(255,255,255,0.45)',
    sloganBright: '#FFFFFF',
    iconFilter: 'brightness(0) invert(1)',
    previewBorder: '#E8603C',
    previewSwatch: ['#E8603C', '#1A1A1A', '#FFFFFF'],
  },
  {
    id: 'clean-white',
    label: 'Clean White',
    description: 'Fundo claro, tipografia bold',
    bg: '#F5F5F0',
    overlayGradient: 'linear-gradient(to top, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 55%, rgba(255,255,255,0) 100%)',
    headlineColor: '#1A1A1A',
    subtextColor: 'rgba(26,26,26,0.65)',
    highlightColor: '#E8603C',
    highlightBgOnImage: 'rgba(232,96,60,0.15)',
    sloganDim: 'rgba(26,26,26,0.35)',
    sloganBright: '#E8603C',
    iconFilter: 'none',
    previewBorder: '#E0E0E0',
    previewSwatch: ['#F5F5F0', '#E8603C', '#1A1A1A'],
  },
  {
    id: 'dark-premium',
    label: 'Dark Premium',
    description: 'Escuro sofisticado',
    bg: 'linear-gradient(160deg, #0F0F0F 0%, #1A1A2E 100%)',
    overlayGradient: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.1) 100%)',
    headlineColor: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.65)',
    highlightColor: '#E8603C',
    highlightBgOnImage: 'rgba(232,96,60,0.25)',
    sloganDim: 'rgba(255,255,255,0.35)',
    sloganBright: '#E8603C',
    iconFilter: 'brightness(0) invert(1)',
    previewBorder: '#00A7B5',
    previewSwatch: ['#0F0F0F', '#E8603C', '#FFFFFF'],
  },
];

function ThemePicker({ selected, onChange }: { selected: CarouselThemeId; onChange: (id: CarouselThemeId) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">TEMA VISUAL</p>
      <div className="grid grid-cols-3 gap-2">
        {CAROUSEL_THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={cn(
              'group relative rounded-xl border-2 p-2.5 transition-all text-left',
              selected === theme.id
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-border hover:border-border/70 bg-card/50'
            )}
          >
            {/* Color swatch row */}
            <div className="flex gap-1 mb-2">
              {theme.previewSwatch.map((c, i) => (
                <div
                  key={i}
                  className="h-3 flex-1 rounded-sm"
                  style={{ background: c, border: c === '#FFFFFF' || c === '#F5F5F0' ? '1px solid rgba(0,0,0,0.1)' : 'none' }}
                />
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

const TYPE_LABELS: Record<string, string> = {
  hook: 'GANCHO',
  setup: 'SETUP',
  data: 'DADOS',
  contrast: 'CONTRASTE',
  validation: 'VALIDAÇÃO',
  cta: 'CTA',
};

const CATEGORY_COLORS: Record<string, string> = {
  pessoa: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ambiente: 'bg-green-500/20 text-green-400 border-green-500/30',
  ferramenta: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ação: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  produto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  outdoor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  indoor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  abstrato: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  equipe: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

// ─── Inject Google Fonts ──────────────────────────────────────────────────────
const fontStyle = document.createElement('style');
fontStyle.textContent = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');`;
if (!document.head.querySelector('[data-dqef-fonts]')) {
  fontStyle.setAttribute('data-dqef-fonts', 'true');
  document.head.appendChild(fontStyle);
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copiar', size = 'sm' }: { text: string; label?: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
        size === 'xs' ? 'px-1.5 py-0.5' : '',
        copied
          ? 'bg-green-500/20 text-green-400'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}

// ─── SlidePreview ─────────────────────────────────────────────────────────────

type TextPosition = 'top' | 'center' | 'bottom';

interface SlidePreviewProps {
  slide: SlideOutput;
  imageUrl?: string;
  slideRef?: React.RefObject<HTMLDivElement>;
  format?: CreativeFormat;
  exportMode?: boolean;
  textScale?: number;
  theme?: CarouselTheme;
  imageOpacity?: number;
  textPosition?: TextPosition;
  headlineScale?: number;
  imageScale?: number;
  imageOffsetY?: number;
}

// Approximate width of a single slide card in the UI preview (px)
const PREVIEW_BASE_WIDTH = 340;

function SlidePreview({ slide, imageUrl, slideRef, format, exportMode = false, textScale = 1, theme, imageOpacity = 0.52, textPosition = 'bottom', headlineScale = 1, imageScale = 1, imageOffsetY = 0 }: SlidePreviewProps) {
  const activeTheme = theme ?? CAROUSEL_THEMES[0];
  const fmt = format ?? CREATIVE_FORMATS[0];
  const exportScale = exportMode ? fmt.width / PREVIEW_BASE_WIDTH : 1;

  const ts = (size: string) => {
    const scale = textScale * exportScale;
    const pxMatch = size.match(/^(\d+(?:\.\d+)?)px$/);
    if (pxMatch) return `${parseFloat(pxMatch[1]) * scale}px`;
    const clampMatch = size.match(/^clamp\((\d+(?:\.\d+)?)px,\s*([^,]+),\s*(\d+(?:\.\d+)?)px\)$/);
    if (clampMatch) {
      if (exportMode) {
        // In export mode resolve clamp to max value * scale (at preview width, clamp always hits max because vw > max)
        return `${parseFloat(clampMatch[3]) * scale}px`;
      }
      return `clamp(${parseFloat(clampMatch[1]) * textScale}px, ${clampMatch[2]}, ${parseFloat(clampMatch[3]) * textScale}px)`;
    }
    return size;
  };
  const bg = activeTheme.bg;
  const isDataSlide = slide.layout === 'number-dominant';
  const isCTA = slide.layout === 'cta-clean';

  const aspectRatio = `${fmt.width}/${fmt.height}`;

  // Safe zone: convert real-px safe zone to % for fluid display, or use px directly in export mode
  const sz = fmt.safeZone;
  const paddingStyle = exportMode
    ? { paddingTop: sz.top, paddingRight: sz.right, paddingBottom: sz.bottom, paddingLeft: sz.left }
    : {
        paddingTop: `${(sz.top / fmt.height) * 100}%`,
        paddingRight: `${(sz.right / fmt.width) * 100}%`,
        paddingBottom: `${(sz.bottom / fmt.height) * 100}%`,
        paddingLeft: `${(sz.left / fmt.width) * 100}%`,
      };

  const renderHeadline = (headline: string, highlight?: string) => {
    if (!highlight || !headline.toLowerCase().includes(highlight.toLowerCase())) {
      return <span style={{ color: activeTheme.headlineColor }}>{headline}</span>;
    }
    const idx = headline.toLowerCase().indexOf(highlight.toLowerCase());
    const before = headline.slice(0, idx);
    const word = headline.slice(idx, idx + highlight.length);
    const after = headline.slice(idx + highlight.length);
    const highlightStyle = imageUrl
      ? { color: activeTheme.highlightColor }
      : { color: activeTheme.headlineColor, backgroundColor: activeTheme.highlightBgOnImage, borderRadius: '2px', padding: '0 3px' };
    return (
      <>
        {before && <span style={{ color: activeTheme.headlineColor }}>{before}</span>}
        <span style={highlightStyle}>{word}</span>
        {after && <span style={{ color: activeTheme.headlineColor }}>{after}</span>}
      </>
    );
  };

  const exportDimensions = exportMode ? { width: fmt.width, height: fmt.height } : {};

  return (
    <div
      ref={slideRef}
      style={{
        background: bg,
        aspectRatio: exportMode ? undefined : aspectRatio,
        ...exportDimensions,
        width: exportMode ? fmt.width : '100%',
        position: 'relative',
        borderRadius: exportMode ? '0' : '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isDataSlide ? 'center' : isCTA ? 'center' : textPosition === 'top' ? 'flex-start' : textPosition === 'center' ? 'center' : 'flex-end',
        alignItems: isCTA ? 'center' : 'flex-start',
        ...paddingStyle,
        boxSizing: 'border-box',
      }}
    >
      {imageUrl && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: imageScale === 1 ? 'cover' : `${imageScale * 100}%`,
            backgroundPosition: `center ${50 + imageOffsetY}%`,
            opacity: imageOpacity,
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: activeTheme.overlayGradient,
            zIndex: 1,
          }} />
        </>
      )}

      {isCTA && (
        <div style={{ textAlign: 'center', width: '100%', position: 'relative', zIndex: 10 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: ts('clamp(16px, 4.5vw, 24px)'),
            color: activeTheme.headlineColor,
            lineHeight: 1.05,
            marginBottom: '10px',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}>
            {renderHeadline(slide.headline, slide.headlineHighlight)}
          </div>
          {slide.subtext && (
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: ts('10px'),
              color: activeTheme.subtextColor,
              letterSpacing: '0.06em',
            }}>{slide.subtext}</div>
          )}
          {/* Slogan */}
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            fontSize: ts('10px'),
            marginTop: '18px',
            letterSpacing: '0.04em',
          }}>
            <span style={{ color: activeTheme.sloganDim }}>pronto. </span>
            <span style={{ color: activeTheme.sloganBright }}>resolvido.</span>
          </div>
        </div>
      )}

      {isDataSlide && !isCTA && (
        <div style={{ width: '100%', textAlign: 'left', position: 'relative', zIndex: 10 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: ts('clamp(44px, 13vw, 72px)'),
            color: activeTheme.headlineColor,
            lineHeight: 0.9,
            letterSpacing: '-0.03em',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}>
            {slide.headline}
          </div>
          {slide.subtext && (
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: ts('11px'),
              color: activeTheme.subtextColor,
              lineHeight: 1.3,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}>{slide.subtext}</div>
          )}
        </div>
      )}

      {!isDataSlide && !isCTA && (
        <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: ts(`clamp(${14 * headlineScale}px, ${3.8 * headlineScale}vw, ${22 * headlineScale}px)`),
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            marginBottom: slide.subtext ? '8px' : '0',
            whiteSpace: 'pre-line' as const,
            textTransform: 'uppercase',
          }}>
            {renderHeadline(slide.headline, slide.headlineHighlight)}
          </div>
          {slide.subtext && (
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: ts('10px'),
              color: activeTheme.subtextColor,
              lineHeight: 1.45,
              letterSpacing: '0.03em',
            }}>{slide.subtext}</div>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: exportMode ? `${10 * exportScale}px` : '10px',
        right: exportMode ? `${10 * exportScale}px` : '10px',
        zIndex: 10,
        opacity: 0.55,
      }}>
        <img src={dqfIcon} alt="DQF" style={{
          width: exportMode ? `${18 * exportScale}px` : '18px',
          height: exportMode ? `${18 * exportScale}px` : '18px',
          filter: activeTheme.iconFilter,
        }} />
      </div>
    </div>
  );
}

// ─── SlideCard ─────────────────────────────────────────────────────────────────

interface SlideCardProps {
  slide: SlideOutput;
  imageUrl?: string;
  isGenerating?: boolean;
  onGenerateImage: (slideNumber: number, prompt: string, quality: 'fast' | 'high') => void;
  onClearImage: (slideNumber: number) => void;
  onApplyLibraryImage: (slideNumber: number, url: string) => void;
  mediaLibraryCount: number;
  userId: string | null;
  onLibraryChange: () => void;
  format: CreativeFormat;
  textScale?: number;
  theme?: CarouselTheme;
  imageOpacity?: number;
  textPosition?: TextPosition;
  headlineScale?: number;
  imageScale?: number;
  imageOffsetY?: number;
}

function buildGenericImagePrompt(slide: SlideOutput): string {
  return `Editorial documentary photography illustrating the concept: "${slide.headline}". ${slide.subtext ? `Context: ${slide.subtext}. ` : ''}Subject: Brazilian autonomous service provider (prestador de serviço autônomo — electrician, plumber, painter, handyman), aged 35-50, weathered hands, varied casual work clothing (plain t-shirt, tank top, button-up shirt, coveralls, hi-vis vest — NOT blue polo), real tools visible. Environment: real Brazilian job site, home under repair, workshop, or neighborhood street. Style: raw documentary truth, natural warm light, high contrast composition, close-up 4:5 framing. The image will have a semi-transparent orange (#E8603C) overlay so use bright, high-contrast scenes. Shot on Canon EOS R5, 35mm lens, f/2.8, photorealistic 4K. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO LOGOS, NO OVERLAYS in the image. NOT stock photo, NOT corporate, NOT studio.`;
}

function SlideCard({ slide, imageUrl, isGenerating, onGenerateImage, onClearImage, onApplyLibraryImage, mediaLibraryCount, userId, onLibraryChange, format, textScale, theme, imageOpacity, textPosition, headlineScale, imageScale, imageOffsetY }: SlideCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editedHeadline, setEditedHeadline] = useState(slide.headline);
  const [editedHighlight, setEditedHighlight] = useState(slide.headlineHighlight ?? '');
  const [editedSubtext, setEditedSubtext] = useState(slide.subtext ?? '');
  const [imageInstruction, setImageInstruction] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [translatedPrompt, setTranslatedPrompt] = useState('');
  const [translating, setTranslating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const editedSlide: SlideOutput = {
    ...slide,
    headline: editedHeadline,
    headlineHighlight: editedHighlight || undefined,
    subtext: editedSubtext || undefined,
  };

  const hasImage = !!imageUrl;
  const basePrompt = slide.imagePrompt ?? buildGenericImagePrompt(slide);

  const buildImagePrompt = () => {
    // If user provided a custom prompt that was translated, use it
    if (translatedPrompt.trim()) {
      return translatedPrompt.trim();
    }
    if (!imageInstruction.trim()) return basePrompt;
    return `${basePrompt}\n\nADJUSTMENT: ${imageInstruction.trim()}`;
  };

  const handleTranslateAndGenerate = async () => {
    if (!customPrompt.trim()) return;
    setTranslating(true);
    try {
      // Translate to English using Lovable AI
      const { data, error } = await supabase.functions.invoke('ai-router', {
        body: {
          task_type: 'classify',
          messages: [
            { role: 'system', content: 'You are a translator. Translate the following text to English. Output ONLY the translated text, nothing else. The text is an image generation prompt for AI art.' },
            { role: 'user', content: customPrompt.trim() },
          ],
        },
      });
      if (error) throw error;
      const translated = data?.choices?.[0]?.message?.content?.trim() || customPrompt.trim();
      setTranslatedPrompt(translated);
      // Now generate with the translated prompt
      onGenerateImage(slide.number, translated, 'fast');
    } catch (e: any) {
      console.error('Translation error:', e);
      // Fallback: use original prompt
      setTranslatedPrompt(customPrompt.trim());
      onGenerateImage(slide.number, customPrompt.trim(), 'fast');
    } finally {
      setTranslating(false);
    }
  };

  const handleExport = async () => {
    const el = exportRef.current;
    if (!el) return;
    setExporting(true);
    try {
      // Export at exact real pixel dimensions — no pixelRatio scaling needed since element is already full-res
      const dataUrl = await toPng(el, {
        cacheBust: true,
        width: format.width,
        height: format.height,
        style: { borderRadius: '0' },
      });
      const link = document.createElement('a');
      link.download = `dqef-slide-${String(slide.number).padStart(2, '0')}-${format.width}x${format.height}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: `PNG ${format.width}×${format.height}px exportado ✅`, description: `${format.label} — ${format.platform}` });
    } catch (err) {
      toast({ title: 'Erro ao exportar', description: String(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const applyLessText = () => {
    const words = editedHeadline.split(' ');
    const keep = Math.max(2, Math.ceil(words.length * 0.6));
    setEditedHeadline(words.slice(0, keep).join(' '));
  };

  const applyChangeApproach = () => {
    const approaches = [
      (h: string) => `E SE ${h}?`,
      (h: string) => `${h.split(' ')[0]} QUE NINGUÉM TE CONTOU`,
      (h: string) => `PARE. ${h}.`,
      (h: string) => `A VERDADE SOBRE ${h}`,
    ];
    const idx = editedHeadline.length % approaches.length;
    const base = slide.headline;
    setEditedHeadline(approaches[idx](base));
  };

  const handleFetchSuggestions = async () => {
    if (!userId) return;
    setShowSuggestions(true);
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-media', {
        body: {
          slideHeadline: editedHeadline,
          slideSubtext: editedSubtext,
          slideImagePrompt: slide.imagePrompt,
          slideType: slide.type,
          userId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(data.suggestions ?? []);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message ?? 'Falha ao buscar sugestões.', variant: 'destructive' });
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleDirectUpload = async (file: File) => {
    if (!userId) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use JPG, PNG ou WEBP.', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 20MB.', variant: 'destructive' });
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uuid = crypto.randomUUID();
      const storagePath = `${userId}/${uuid}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Apply to slide immediately
      onApplyLibraryImage(slide.number, publicUrl);

      // Save to DB
      const { data: insertData, error: insertError } = await supabase
        .from('media_library')
        .insert({ user_id: userId, url: publicUrl, filename: file.name, file_size: file.size })
        .select('id')
        .single();
      if (insertError) throw insertError;

      toast({ title: 'Imagem inserida ✅', description: 'Categorizando automaticamente...' });
      onLibraryChange();

      // Categorize in background
      supabase.functions.invoke('categorize-media', {
        body: { imageUrl: publicUrl, mediaId: insertData.id },
      }).then(() => onLibraryChange());
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card flex flex-col">

      {/* ── Slide preview (display — fluid) ── */}
      <div className="p-3">
        <SlidePreview slide={editedSlide} imageUrl={imageUrl} slideRef={slideRef} format={format} textScale={textScale} theme={theme} imageOpacity={imageOpacity} textPosition={textPosition} headlineScale={headlineScale} imageScale={imageScale} imageOffsetY={imageOffsetY} />
      </div>

      {/* ── Quick actions bar ── */}
      <div className="px-3 pb-2 flex items-center gap-1.5">
        <button
          onClick={applyLessText}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
          title="Reduzir texto"
        >
          <Minimize2 className="h-2.5 w-2.5" />
          Menos texto
        </button>
        <button
          onClick={applyChangeApproach}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
          title="Mudar abordagem"
        >
          <Shuffle className="h-2.5 w-2.5" />
          Mudar abordagem
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all ml-auto disabled:opacity-40"
          title="Baixar PNG"
        >
          {exporting
            ? <span className="h-2.5 w-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            : <Download className="h-2.5 w-2.5" />}
          PNG
        </button>
      </div>

      {/* ── Copy editing ── */}
      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2.5">
        <p className="text-[9px] font-bold text-muted-foreground/60 tracking-[0.15em] uppercase">Copy</p>
        <textarea
          value={editedHeadline}
          onChange={e => setEditedHeadline(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 font-bold uppercase tracking-wide"
          placeholder="Headline..."
        />
        <div className="flex gap-1.5">
          <input
            value={editedHighlight}
            onChange={e => setEditedHighlight(e.target.value)}
            className="flex-1 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="Destaque (laranja)"
          />
          <input
            value={editedSubtext}
            onChange={e => setEditedSubtext(e.target.value)}
            className="flex-1 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="Subtexto"
          />
        </div>
      </div>

      {/* ── Image section ── */}
      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2.5">
        <p className="text-[9px] font-bold text-muted-foreground/60 tracking-[0.15em] uppercase">Imagem de fundo</p>

        {/* Hidden file input for direct upload */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleDirectUpload(f); e.target.value = ''; }}
        />

        {/* Custom prompt for image generation (PT → EN translation) */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
          <p className="text-[9px] font-bold text-primary tracking-[0.15em] uppercase flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Prompt personalizado (PT→EN)
          </p>
          <textarea
            value={customPrompt}
            onChange={e => { setCustomPrompt(e.target.value); setTranslatedPrompt(''); }}
            rows={2}
            className="w-full rounded-md border border-primary/20 bg-card px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder='Descreva a imagem em português. Ex: "Eletricista sorrindo em obra, luz natural dourada, close-up"'
          />
          {translatedPrompt && (
            <div className="rounded-md bg-muted/30 px-2 py-1.5">
              <p className="text-[8px] font-bold text-muted-foreground/50 uppercase mb-0.5">Tradução usada:</p>
              <p className="text-[10px] text-muted-foreground leading-snug italic">{translatedPrompt}</p>
            </div>
          )}
          <button
            onClick={handleTranslateAndGenerate}
            disabled={isGenerating || translating || !customPrompt.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all border',
              (isGenerating || translating || !customPrompt.trim())
                ? 'border-border text-muted-foreground cursor-not-allowed'
                : 'border-primary bg-primary/15 text-primary hover:bg-primary/25'
            )}
          >
            {translating
              ? <><span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> Traduzindo...</>
              : isGenerating
                ? <><span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> Gerando...</>
                : <><Wand2 className="h-3 w-3" /> Traduzir e Gerar Imagem</>}
          </button>
        </div>

        {/* Quick instruction adjustment */}
        <textarea
          value={imageInstruction}
          onChange={e => setImageInstruction(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          placeholder='Ajuste rápido: "luz dourada", "ângulo de baixo", "preto e branco"...'
        />

        {/* Generate via AI (standard) */}
        <button
          onClick={() => onGenerateImage(slide.number, buildImagePrompt(), 'fast')}
          disabled={isGenerating || uploadingImage || translating}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border',
            (isGenerating || uploadingImage || translating)
              ? 'border-border text-muted-foreground cursor-not-allowed'
              : hasImage
                ? 'border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                : 'border-primary/50 text-primary hover:bg-primary/10'
          )}
        >
          {isGenerating
            ? <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
            : hasImage ? <RefreshCw className="h-3 w-3" /> : <Image className="h-3 w-3" />}
          {isGenerating ? 'Gerando...' : hasImage
            ? (imageInstruction.trim() ? 'Aplicar ajuste' : 'Trocar imagem')
            : 'Gerar imagem (automático)'}
        </button>

        {/* Direct upload from device */}
        <button
          onClick={() => uploadInputRef.current?.click()}
          disabled={uploadingImage || isGenerating}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-40"
        >
          {uploadingImage
            ? <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
            : <Upload className="h-3 w-3" />}
          {uploadingImage ? 'Enviando...' : 'Inserir imagem do dispositivo'}
        </button>

        {/* Library search button — shown only when user has media */}
        {mediaLibraryCount > 0 && (
          <button
            onClick={showSuggestions ? () => setShowSuggestions(false) : handleFetchSuggestions}
            disabled={loadingSuggestions}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border',
              showSuggestions
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            )}
          >
            {loadingSuggestions
              ? <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
              : <Library className="h-3 w-3" />}
            {loadingSuggestions ? 'Buscando...' : showSuggestions ? 'Fechar biblioteca' : `Buscar na biblioteca (${mediaLibraryCount})`}
          </button>
        )}

        {/* Tirar imagem */}
        {hasImage && (
          <button
            onClick={() => onClearImage(slide.number)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border border-destructive/30 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          >
            <ImageIcon className="h-3 w-3" />
            Tirar imagem
          </button>
        )}

        {/* ── Library suggestions inline ── */}
        {showSuggestions && !loadingSuggestions && (
          <div className="mt-2 space-y-2">
            {suggestions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-3">Nenhuma sugestão encontrada para esta lâmina.</p>
            ) : (
              <>
                <p className="text-[9px] font-bold text-muted-foreground/60 tracking-[0.15em] uppercase">Sugestões por relevância</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onApplyLibraryImage(slide.number, s.url);
                        setShowSuggestions(false);
                      }}
                      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all"
                      title={s.reason}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={s.url}
                          alt={s.filename}
                          className="w-full h-full object-cover"
                        />
                        {/* Relevance score badge */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/70 rounded-full px-1.5 py-0.5">
                          <Star className="h-2 w-2 text-yellow-400 fill-yellow-400" />
                          <span className="text-[9px] font-bold text-white">{s.score}</span>
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">Aplicar</span>
                        </div>
                      </div>
                      {s.category && (
                        <div className="px-1.5 py-1 bg-muted/30">
                          <span className="text-[8px] font-medium text-muted-foreground truncate block">{s.category}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Logic toggle ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 transition-colors border-t border-border/50"
      >
        <span className="tracking-widest uppercase font-medium">Lógica · Mídia</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="px-3 py-3 space-y-3 border-t border-border/50 bg-muted/5">
          <div>
            <p className="text-[9px] font-bold text-primary/70 tracking-widest uppercase mb-1">Lógica estratégica</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{slide.logic}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground/50 tracking-widest uppercase mb-1">Direção visual</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{slide.visualDirection}</p>
          </div>
          {(slide.imagePrompt || slide.veoPrompt) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold text-muted-foreground/50 tracking-widest uppercase">
                  {slide.mediaType === 'video' ? 'Prompt VEO 3.1' : 'Prompt imagem'}
                </p>
                <CopyButton text={slide.imagePrompt ?? slide.veoPrompt ?? ''} label="Copiar" />
              </div>
              <pre className="text-[10px] text-muted-foreground/70 leading-relaxed bg-muted/20 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {slide.imagePrompt ?? slide.veoPrompt}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Offscreen full-res node for PNG export */}
      <div style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <SlidePreview slide={editedSlide} imageUrl={imageUrl} slideRef={exportRef} format={format} exportMode textScale={textScale} theme={theme} imageOpacity={imageOpacity} textPosition={textPosition} headlineScale={headlineScale} imageScale={imageScale} imageOffsetY={imageOffsetY} />
      </div>
    </div>
  );
}

// ─── StrategicPanel ───────────────────────────────────────────────────────────

interface StrategyDoc {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface StrategyData {
  positioning: string;
  differentials: string;
  targetAudience: string;
  pains: string;
  toneOfVoice: string;
  competitors: string;
  forbiddenTopics: string;
  currentObjective: string;
  kpis: string;
  docs: StrategyDoc[];
}

const STRATEGY_STORAGE_KEY = 'dqef_strategy_v1';

// ─── Strategic Review Button (Knowledge Base summary) ─────────────────────────

function StrategicReviewButton({ userId }: { userId: string | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<{
    docs: { name: string; status: string; fields: string[] }[];
    metafields: Record<string, string>;
    missingAreas: string[];
    readiness: number;
  } | null>(null);

  const handleReview = async () => {
    if (!userId) {
      toast({ title: 'Faça login primeiro', variant: 'destructive' });
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      // Fetch knowledge base docs
      const { data: docs } = await supabase
        .from('strategy_knowledge')
        .select('document_name, status, extracted_knowledge')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch local meta-fields
      let metafields: Record<string, string> = {};
      try {
        const raw = localStorage.getItem('dqef_strategy_metafields_v1');
        if (raw) metafields = JSON.parse(raw);
      } catch { /* ignore */ }

      // Fetch local playbook
      let playbook: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(STRATEGY_STORAGE_KEY);
        if (raw) playbook = JSON.parse(raw);
      } catch { /* ignore */ }

      // Build review
      const docsSummary = (docs || []).map((d: any) => {
        const k = d.extracted_knowledge as Record<string, unknown> | null;
        const fields: string[] = [];
        if (k) {
          if (k.brandName) fields.push('Marca');
          if (k.brandEssence) fields.push('Essência');
          if (k.positioning) fields.push('Posicionamento');
          if (k.toneOfVoice) fields.push('Tom de Voz');
          if (k.uniqueValueProp) fields.push('Proposta de Valor');
          if (k.targetAudience) fields.push('Persona');
          if (Array.isArray(k.keyMessages) && k.keyMessages.length) fields.push('Mensagens-chave');
          if (Array.isArray(k.contentAngles) && k.contentAngles.length) fields.push('Ângulos');
          if (k.ctaStyle) fields.push('Estilo CTA');
          if (k.promptContext) fields.push('System Prompt');
        }
        return { name: d.document_name, status: d.status, fields };
      });

      const missingAreas: string[] = [];
      const allFields = docsSummary.flatMap((d: any) => d.fields);
      const metaKeys = Object.keys(metafields).filter(k => metafields[k] && metafields[k].length > 10);
      const playbookKeys = Object.keys(playbook).filter(k => playbook[k] && playbook[k].length > 10);

      if (!allFields.includes('Posicionamento') && !playbookKeys.includes('positioning')) missingAreas.push('Posicionamento da marca');
      if (!allFields.includes('Tom de Voz') && !playbookKeys.includes('toneOfVoice')) missingAreas.push('Tom de voz');
      if (!allFields.includes('Persona') && !playbookKeys.includes('targetAudience')) missingAreas.push('Perfil do público-alvo');
      if (!allFields.includes('Proposta de Valor')) missingAreas.push('Proposta de valor única');
      if (!metaKeys.includes('promptContext')) missingAreas.push('System Prompt da marca');

      const doneDocs = docsSummary.filter((d: any) => d.status === 'done').length;
      const totalChecks = 5;
      const passedChecks = totalChecks - missingAreas.length;
      const readiness = Math.round((passedChecks / totalChecks) * 100);

      setReview({ docs: docsSummary, metafields, missingAreas, readiness });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao carregar revisão', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleReview}
        className="w-full flex items-center gap-2 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/10"
      >
        <ShieldCheck className="h-4 w-4" />
        Revisão Estratégica
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Revisão Estratégica</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analisando materiais...</p>
              </div>
            ) : review ? (
              <div className="space-y-5">
                {/* Readiness Score */}
                <div className={cn(
                  'rounded-xl p-4 border text-center',
                  review.readiness >= 80 ? 'border-green-500/30 bg-green-500/5' :
                  review.readiness >= 50 ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-red-500/30 bg-red-500/5'
                )}>
                  <p className="text-3xl font-black text-foreground">{review.readiness}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {review.readiness >= 80 ? '✅ Estratégia robusta — pronto para gerar' :
                     review.readiness >= 50 ? '⚠️ Estratégia parcial — resultados podem ser genéricos' :
                     '🔴 Estratégia fraca — preencha o playbook primeiro'}
                  </p>
                </div>

                {/* Knowledge Base Docs */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">BRAND BOOK / KNOWLEDGE BASE</p>
                  {review.docs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">Nenhum documento no knowledge base. Envie na aba Estratégia.</p>
                  ) : (
                    <div className="space-y-2">
                      {review.docs.map((doc, i) => (
                        <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-foreground truncate max-w-[250px]">{doc.name}</p>
                            <Badge variant={doc.status === 'done' ? 'default' : 'secondary'} className="text-[9px] h-5">
                              {doc.status === 'done' ? '✅ Analisado' : doc.status === 'analyzing' ? '⏳ Analisando' : '⏸ Pendente'}
                            </Badge>
                          </div>
                          {doc.fields.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {doc.fields.map(f => (
                                <span key={f} className="text-[9px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{f}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing Areas */}
                {review.missingAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2">⚠️ ÁREAS NÃO MAPEADAS</p>
                    <div className="space-y-1.5">
                      {review.missingAreas.map(area => (
                        <div key={area} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          <span>{area}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      Preencha no Playbook (aba Estratégia) ou envie documentos ao Knowledge Base para melhorar as gerações.
                    </p>
                  </div>
                )}

                {/* All clear */}
                {review.missingAreas.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-semibold">Todas as áreas estratégicas estão mapeadas. A IA tem contexto completo.</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function StrategyInputSection({ userId, strategyEnabled, setStrategyEnabled }: { userId: string | null; strategyEnabled: boolean; setStrategyEnabled: (v: boolean) => void }) {
  const [metaFields, setMetaFields] = useState<Record<string, string> | null>(null);
  const [kbDocs, setKbDocs] = useState<{ name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load meta-fields from localStorage
    try {
      const raw = localStorage.getItem('dqef_strategy_metafields_v1');
      if (raw) setMetaFields(JSON.parse(raw));
    } catch { /* ignore */ }

    // Load KB docs from backend
    if (userId) {
      supabase
        .from('strategy_knowledge')
        .select('document_name, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data }) => {
          if (data) setKbDocs(data.map(d => ({ name: d.document_name, status: d.status })));
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId]);

  const hasEssencia = !!metaFields?.essencia;
  const hasPositioning = !!metaFields?.posicionamento;
  const hasPersona = !!metaFields?.persona;
  const hasTom = !!metaFields?.tomDeVoz;
  const hasPrompt = !!metaFields?.promptContext;
  const pillars = [
    { label: 'Essência', ok: hasEssencia },
    { label: 'Posicionamento', ok: hasPositioning },
    { label: 'Persona', ok: hasPersona },
    { label: 'Tom', ok: hasTom },
    { label: 'System Prompt', ok: hasPrompt },
  ];
  const score = pillars.filter(p => p.ok).length;
  const doneDocs = kbDocs.filter(d => d.status === 'done').length;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Fundação Estratégica</span>
        </div>
        <button
          onClick={() => setStrategyEnabled(!strategyEnabled)}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            strategyEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        >
          <span className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
            strategyEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
          )} />
        </button>
      </div>

      {strategyEnabled && (
        <>
          {loading ? (
            <div className="h-12 rounded-lg bg-muted/30 animate-pulse" />
          ) : (
            <>
              {/* Pillars mini-scorecard */}
              <div className="flex flex-wrap gap-1.5">
                {pillars.map(p => (
                  <span
                    key={p.label}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                      p.ok
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-border bg-muted/30 text-muted-foreground'
                    )}
                  >
                    {p.ok ? '✓' : '○'} {p.label}
                  </span>
                ))}
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      score >= 4 ? 'bg-green-500' : score >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${(score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">{score}/5</span>
              </div>

              {/* KB docs status */}
              {kbDocs.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Knowledge Base ({doneDocs} doc{doneDocs !== 1 ? 's' : ''})</p>
                  {kbDocs.slice(0, 3).map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        doc.status === 'done' ? 'bg-green-500' : doc.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                      )} />
                      <span className="text-muted-foreground truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">
                  Nenhum documento na KB. <a href="/estrategia" className="text-primary hover:underline">Envie na aba Estratégia →</a>
                </p>
              )}

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {strategyEnabled
                  ? '✓ A IA usará posicionamento, tom e persona da estratégia na geração.'
                  : 'Desativado — a IA gerará sem contexto estratégico.'}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StrategicPanel() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const defaultStrategy: StrategyData = {
    positioning: '',
    differentials: '',
    targetAudience: '',
    pains: '',
    toneOfVoice: '',
    competitors: '',
    forbiddenTopics: '',
    currentObjective: '',
    kpis: '',
    docs: [],
  };

  const [data, setData] = useState<StrategyData>(() => {
    try {
      const saved = localStorage.getItem(STRATEGY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultStrategy;
    } catch {
      return defaultStrategy;
    }
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const update = (field: keyof StrategyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
    toast({ title: 'Estratégia salva ✅', description: 'Os dados foram salvos localmente.' });
    setTimeout(() => setSaved(false), 3000);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);

    const newDocs: StrategyDoc[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 20MB.`, variant: 'destructive' });
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const uuid = crypto.randomUUID();
      const storagePath = `${userId}/strategy/${uuid}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (storageError) {
        toast({ title: 'Erro no upload', description: storageError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);

      newDocs.push({
        id: uuid,
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      });
    }

    setUploading(false);

    if (newDocs.length > 0) {
      setData(prev => {
        const updated = { ...prev, docs: [...prev.docs, ...newDocs] };
        localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      toast({ title: `${newDocs.length} arquivo(s) enviado(s) ✅`, description: 'Referências de estratégia salvas.' });
    }
  };

  const handleDeleteDoc = async (doc: StrategyDoc) => {
    if (!userId) return;

    const urlParts = doc.url.split('/media-library/');
    const storagePath = urlParts[1];
    if (storagePath) {
      await supabase.storage.from('media-library').remove([storagePath]);
    }

    setData(prev => {
      const updated = { ...prev, docs: prev.docs.filter(d => d.id !== doc.id) };
      localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast({ title: 'Arquivo removido', description: doc.name });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-400" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const sections = [
    {
      key: 'positioning',
      label: 'POSICIONAMENTO',
      icon: <Target className="h-3.5 w-3.5" />,
      placeholder: 'Como a marca se posiciona no mercado? Qual é a promessa central?\nEx: Plataforma de serviços que paga o prestador na hora, com taxa justa.',
      hint: 'A âncora de tudo. Sem isso, o conteúdo fica genérico.',
      rows: 3,
    },
    {
      key: 'differentials',
      label: 'DIFERENCIAIS COMPETITIVOS',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      placeholder: 'Liste os diferenciais reais (números, fatos):\n• Comissão de 10-15% vs 27% da concorrência\n• PIX imediato na conclusão\n• Profissionais verificados por KYC',
      hint: 'Diferenciais com números convertem. Adjetivos não.',
      rows: 4,
    },
    {
      key: 'targetAudience',
      label: 'PÚBLICO-ALVO',
      icon: <Users className="h-3.5 w-3.5" />,
      placeholder: 'Descreva quem é o público principal:\n• Perfil: Piscineiro autônomo, 28-45 anos\n• Renda: R$ 3.000–8.000/mês\n• Dor: Depende de indicação, não escala',
      hint: 'Fale para uma pessoa, não para "todo mundo".',
      rows: 4,
    },
    {
      key: 'pains',
      label: 'DORES E FRUSTRAÇÕES',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      placeholder: 'Quais as frases que o público pensa ou fala?\n• "Pago 27% pro GetNinjas e perco o cliente"\n• "Fico sem trabalho no mês fraco"\n• "Nunca aprendi a me vender no digital"',
      hint: 'Copie a voz do cliente. Quem escreve como o cliente, vende.',
      rows: 4,
    },
    {
      key: 'toneOfVoice',
      label: 'TOM DE VOZ',
      icon: <Megaphone className="h-3.5 w-3.5" />,
      placeholder: 'Como a marca fala? Dê exemplos do que pode e não pode:\n✅ Pode: "Tu manda bem. Tu merece mais."\n❌ Não pode: "Você possui habilidades excepcionais."\nTom: Direto, peer-to-peer, sem jargão corporativo.',
      hint: 'O tom que a IA deve imitar. Quanto mais específico, melhor.',
      rows: 4,
    },
    {
      key: 'competitors',
      label: 'CONCORRENTES',
      icon: <BookOpen className="h-3.5 w-3.5" />,
      placeholder: 'Quem são os concorrentes e como a marca se diferencia de cada um?\n• GetNinjas: cobra por lead, sem garantia → nós cobramos só se fechar\n• Parafuzo: taxa de 35% → nós cobramos 10-15%',
      hint: 'Comparativos geram conteúdo viral. Nomeie com cuidado.',
      rows: 3,
    },
    {
      key: 'forbiddenTopics',
      label: 'TÓPICOS PROIBIDOS',
      icon: <X className="h-3.5 w-3.5" />,
      placeholder: 'O que a marca nunca deve dizer ou prometer?\n• Não mencionar cidades específicas\n• Não prometer "renda garantida"\n• Não atacar concorrentes pelo nome diretamente',
      hint: 'Limites claros evitam crises de comunicação.',
      rows: 3,
    },
    {
      key: 'currentObjective',
      label: 'OBJETIVO ATUAL',
      icon: <Zap className="h-3.5 w-3.5" />,
      placeholder: 'Qual é o objetivo dos próximos 30-90 dias?\nEx: Cadastrar 200 prestadores verificados até março. Foco em conversão, não em awareness.',
      hint: 'O objetivo muda o tipo de conteúdo. Seja específico.',
      rows: 3,
    },
    {
      key: 'kpis',
      label: 'KPIS E METAS DE CONTEÚDO',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      placeholder: 'Quais métricas definem sucesso?\n• Taxa de salvamento acima de 8%\n• 500 cliques no link da bio por mês\n• 30% de aumento de cadastros orgânicos',
      hint: 'KPIs guiam o tipo de CTA e o ângulo do conteúdo.',
      rows: 3,
    },
  ] as const;

  const completedFields = sections.filter(s => (data[s.key as keyof StrategyData] as string).trim().length > 0).length;
  const completionPct = Math.round((completedFields / sections.length) * 100);

  return (
    <div className="space-y-5">
      {/* Progress indicator */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted-foreground tracking-widest">PREENCHIMENTO DO PLAYBOOK</span>
          <span className="text-xs font-mono font-bold text-primary">{completionPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          {completedFields} de {sections.length} seções preenchidas · Quanto mais completo, mais preciso o conteúdo gerado.
        </p>
      </div>

      {/* Fields */}
      {sections.map(section => {
        const value = data[section.key as keyof StrategyData] as string;
        const filled = value.trim().length > 0;
        return (
          <div key={section.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex items-center gap-1.5 text-[10px] font-bold tracking-widest',
                filled ? 'text-primary' : 'text-muted-foreground'
              )}>
                {section.icon}
                {section.label}
              </span>
              {filled && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">✓</span>
              )}
            </div>
            <Textarea
              value={value}
              onChange={e => update(section.key as keyof StrategyData, e.target.value)}
              placeholder={section.placeholder}
              rows={section.rows}
              className="text-xs resize-none bg-muted/20 border-border/60 placeholder:text-muted-foreground/40 leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground/50 italic pl-0.5">
              💡 {section.hint}
            </p>
          </div>
        );
      })}

      {/* Documents section */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest">ARQUIVOS DE REFERÊNCIA</span>
          {data.docs.length > 0 && (
            <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">{data.docs.length}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/50 italic">
          Faça upload de decks, guides de marca, pesquisas, briefings ou qualquer referência relevante.
        </p>

        {/* Doc list */}
        {data.docs.length > 0 && (
          <div className="space-y-2">
            {data.docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <div className="flex-shrink-0">
                  {getFileIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground/60">{formatBytes(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {doc.type.startsWith('image/') && (
                    <button
                      onClick={() => setPreview(preview === doc.url ? null : doc.url)}
                      className="rounded p-1 hover:bg-muted transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 hover:bg-muted transition-colors"
                    title="Abrir"
                  >
                    <Download className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </a>
                  <button
                    onClick={() => handleDeleteDoc(doc)}
                    className="rounded p-1 hover:bg-destructive/20 transition-colors group"
                    title="Remover"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image preview */}
        {preview && (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={preview} alt="Preview" className="w-full object-contain max-h-48" />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFileUpload(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !userId}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all py-3.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {uploading
            ? <><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Enviando...</>
            : <><PlusCircle className="h-3.5 w-3.5" /> Adicionar arquivo de referência</>
          }
        </button>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        className={cn(
          'w-full h-11 text-sm font-bold rounded-xl transition-all',
          saved
            ? 'bg-green-600 hover:bg-green-600 text-white'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        )}
      >
        {saved ? <><Check className="h-4 w-4 mr-2" /> Playbook salvo</> : 'Salvar playbook estratégico'}
      </Button>
    </div>
  );
}

// ─── MediaLibraryPanel ────────────────────────────────────────────────────────

interface MediaLibraryPanelProps {
  userId: string | null;
  library: MediaItem[];
  onLibraryChange: () => void;
}

function MediaLibraryPanel({ userId, library, onLibraryChange }: MediaLibraryPanelProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [categorizingIds, setCategorizingIds] = useState<Set<string>>(new Set());
  const [recategorizing, setRecategorizing] = useState(false);
  const [recatProgress, setRecatProgress] = useState<{ current: number; total: number } | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLibrary = tagFilter.trim()
    ? library.filter(item => {
        const q = tagFilter.trim().toLowerCase();
        return (
          item.category?.toLowerCase().includes(q) ||
          item.tags?.some(t => t.toLowerCase().includes(q)) ||
          item.description?.toLowerCase().includes(q) ||
          item.filename?.toLowerCase().includes(q)
        );
      })
    : library;

  const handleRecategorizeAll = async () => {
    if (!userId || library.length === 0) return;
    setRecategorizing(true);
    const total = library.length;
    setRecatProgress({ current: 0, total });
    const BATCH = 3;
    let done = 0;

    for (let i = 0; i < library.length; i += BATCH) {
      const chunk = library.slice(i, i + BATCH);
      await Promise.allSettled(
        chunk.map(item =>
          supabase.functions.invoke('categorize-media', {
            body: { imageUrl: item.url, mediaId: item.id },
          })
        )
      );
      done += chunk.length;
      setRecatProgress({ current: Math.min(done, total), total });
    }

    setRecategorizing(false);
    setRecatProgress(null);
    onLibraryChange();
    toast({ title: `✅ ${total} imagens recategorizadas!`, description: 'Taxonomia granular DQEF aplicada.' });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);

    const uploadedIds: string[] = [];

    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({ title: 'Formato inválido', description: `${file.name} não é JPG, PNG ou WEBP.`, variant: 'destructive' });
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 20MB.`, variant: 'destructive' });
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uuid = crypto.randomUUID();
      const storagePath = `${userId}/${uuid}.${ext}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (storageError) {
        toast({ title: 'Erro no upload', description: storageError.message, variant: 'destructive' });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Insert into media_library
      const { data: insertData, error: insertError } = await supabase
        .from('media_library')
        .insert({
          user_id: userId,
          url: publicUrl,
          filename: file.name,
          file_size: file.size,
        })
        .select('id')
        .single();

      if (insertError) {
        toast({ title: 'Erro ao salvar', description: insertError.message, variant: 'destructive' });
        continue;
      }

      uploadedIds.push(insertData.id);
    }

    setUploading(false);
    onLibraryChange();

    // Categorize uploaded images in background
    for (const mediaId of uploadedIds) {
      setCategorizingIds(prev => new Set([...prev, mediaId]));
      const item = library.find(i => i.id === mediaId);
      const url = item?.url;

      // Re-fetch to get the URL of newly uploaded items
      const { data: newItem } = await supabase
        .from('media_library')
        .select('url')
        .eq('id', mediaId)
        .single();

      if (newItem?.url) {
        supabase.functions.invoke('categorize-media', {
          body: { imageUrl: newItem.url, mediaId },
        }).then(({ error }) => {
          if (!error) {
            setCategorizingIds(prev => { const s = new Set(prev); s.delete(mediaId); return s; });
            onLibraryChange();
          }
        });
      }
    }

    if (uploadedIds.length > 0) {
      toast({ title: `${uploadedIds.length} imagem(ns) enviada(s) ✅`, description: 'Categorização automática em andamento...' });
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!userId) return;

    // Extract storage path from URL
    const urlParts = item.url.split('/media-library/');
    const storagePath = urlParts[1];

    if (storagePath) {
      await supabase.storage.from('media-library').remove([storagePath]);
    }

    const { error } = await supabase.from('media_library').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    onLibraryChange();
    toast({ title: 'Imagem removida', description: item.filename });
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => handleUpload(e.target.files)}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !userId}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all py-4 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        {uploading
          ? <><span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Enviando...</>
          : <><Upload className="h-4 w-4" /> Enviar imagens (JPG, PNG, WEBP)</>
        }
      </button>

      {/* Recategorize button */}
      {library.length > 0 && (
        <button
          onClick={handleRecategorizeAll}
          disabled={recategorizing || !userId}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {recategorizing
            ? <><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Recategorizando {recatProgress?.current}/{recatProgress?.total}...</>
            : <><RefreshCw className="h-3.5 w-3.5" /> Recategorizar Biblioteca (IA Granular)</>
          }
        </button>
      )}

      {/* Tag search filter */}
      {library.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            placeholder="Buscar por tag, categoria ou descrição..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          {tagFilter && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50">
              {filteredLibrary.length}/{library.length}
            </span>
          )}
        </div>
      )}

      {/* Library grid */}
      {library.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Library className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sua biblioteca está vazia</p>
          <p className="text-xs mt-1 opacity-60">Envie imagens para reutilizá-las nos carrosséis</p>
        </div>
      ) : filteredLibrary.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Nenhuma imagem encontrada para "{tagFilter}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredLibrary.map(item => {
            const isCategorizing = categorizingIds.has(item.id);
            const catColor = item.category ? CATEGORY_COLORS[item.category] ?? 'bg-muted/30 text-muted-foreground border-border' : '';

            return (
              <div key={item.id} className="group relative rounded-lg overflow-hidden border border-border">
                <div className="aspect-square relative">
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                  />
                  {isCategorizing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] text-white font-medium">Analisando...</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                  >
                    <Trash2 className="h-2.5 w-2.5 text-white" />
                  </button>
                </div>
                {/* Smart tags */}
                <div className="px-1.5 py-1 bg-muted/30 space-y-0.5">
                  {item.category && (
                    <span className={cn('inline-flex text-[8px] font-bold px-1.5 py-0.5 rounded-full border', catColor)}>
                      {item.category}
                    </span>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {item.tags.slice(0, 4).map((tag, i) => (
                        <span
                          key={i}
                          className={cn(
                            'text-[7px] px-1 py-0.5 rounded',
                            i === 0 ? 'bg-primary/15 text-primary font-semibold' : 'bg-muted/50 text-muted-foreground/70'
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 4 && (
                        <span className="text-[7px] text-muted-foreground/40">+{item.tags.length - 4}</span>
                      )}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-[7px] text-muted-foreground/50 truncate">{item.description}</p>
                  )}
                  {!item.category && !isCategorizing && (
                    <span className="text-[8px] text-muted-foreground/40">sem categoria</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AngleRecommendation ──────────────────────────────────────────────────────

function AngleRecommendation({ carousel }: { carousel: CarouselOutput }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-bold text-primary tracking-widest">RECOMENDAÇÃO ESTRATÉGICA · FEVEREIRO 2026</span>
      </div>
      <div className="text-lg font-bold text-foreground mb-1">
        ÂNGULO: {carousel.angleEmoji} {carousel.angle}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{carousel.angleRationale}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground">Alternativas consideradas:</span>
        {['RAIVA', 'DINHEIRO', 'ORGULHO', 'URGÊNCIA', 'ALÍVIO'].filter(a => a !== carousel.angle).map(a => (
          <span key={a} className="text-xs text-muted-foreground/60 font-mono">· {a}</span>
        ))}
      </div>
    </div>
  );
}

// ─── HTML Exporter ────────────────────────────────────────────────────────────

function exportCarouselHTML(carousel: CarouselOutput, slideImages: Record<number, string>) {
  const slidesHTML = carousel.slides.map(slide => {
    const bg = BG_COLORS[slide.bgStyle] ?? SLIDE_BG;
    const isData = slide.layout === 'number-dominant';
    const isCTA = slide.layout === 'cta-clean';
    const imgUrl = slideImages[slide.number];

    const promptSection = slide.needsMedia && (slide.imagePrompt || slide.veoPrompt) ? `
      <div class="prompt-box">
        ${slide.mediaType === 'photo' && slide.imagePrompt ? `
          <div class="prompt-label">📸 PROMPT IMAGEM</div>
          <pre class="prompt-text">${slide.imagePrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        ` : ''}
        ${slide.mediaType === 'video' && slide.veoPrompt ? `
          <div class="prompt-label">🎬 PROMPT VEO 3.1</div>
          <pre class="prompt-text">${slide.veoPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        ` : ''}
      </div>
    ` : '';

    const headlineHTML = slide.headlineHighlight && slide.headline.toLowerCase().includes((slide.headlineHighlight ?? '').toLowerCase())
      ? slide.headline.replace(new RegExp(`(${slide.headlineHighlight})`, 'gi'), '<span class="highlight">$1</span>')
      : slide.headline;

    const bgImageStyle = imgUrl
      ? `background-image: url(${imgUrl}); background-size: cover; background-position: center;`
      : '';

    return `
    <div class="slide-section">
      <div class="slide-frame" style="background:${bg}; ${bgImageStyle}">
        ${imgUrl ? `<div class="img-overlay"></div>` : ''}
        <div class="slide-label">${String(slide.number).padStart(2, '0')} · ${TYPE_LABELS[slide.type] ?? slide.type.toUpperCase()}</div>
        <div class="slide-content ${isCTA ? 'cta-content' : ''}">
          <div class="${isData ? 'headline-data' : 'headline'}">${headlineHTML}</div>
          ${slide.subtext ? `<div class="subtext">${slide.subtext}</div>` : ''}
        </div>
        <div class="watermark">DQEF</div>
      </div>
      <div class="slide-meta">
        <div class="meta-label">→ LÓGICA</div>
        <div class="meta-text">${slide.logic}</div>
        <div class="meta-label" style="margin-top:8px;">🎨 DIREÇÃO VISUAL</div>
        <div class="meta-text">${slide.visualDirection}</div>
      </div>
      ${promptSection}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${carousel.title} · DQEF</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1a1a1a; color: #FFFFFF; font-family: 'Montserrat', sans-serif; min-height: 100vh; }
  .topbar { background: #E8603C; padding: 12px 32px; display: flex; align-items: center; justify-content: space-between; }
  .topbar-brand { font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.15em; }
  .topbar-meta { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.7); letter-spacing: 0.1em; }
  .container { max-width: 680px; margin: 0 auto; padding: 40px 24px; }
  .carousel-title { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 36px; color: #FFFFFF; letter-spacing: -0.02em; line-height: 1; margin-bottom: 8px; text-transform: uppercase; }
  .carousel-meta { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #888; letter-spacing: 0.1em; margin-bottom: 6px; }
  .viral-logic { font-size: 12px; color: #aaa; line-height: 1.5; margin-bottom: 32px; padding: 12px 16px; border-left: 3px solid #E8603C; background: rgba(232,96,60,0.08); }
  .slide-section { margin-bottom: 40px; }
  .slide-frame { aspect-ratio: 4/5; width: 100%; border-radius: 10px; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; overflow: hidden; background: #E8603C; }
  .img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.05) 100%); }
  .slide-label { position: absolute; top: 14px; left: 16px; font-family: 'Montserrat', sans-serif; font-size: 9px; font-weight: 800; color: rgba(255,255,255,0.9); letter-spacing: 0.14em; z-index: 2; }
  .slide-content { position: relative; z-index: 2; }
  .cta-content { text-align: center; align-self: center; width: 100%; }
  .headline { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: clamp(26px, 7vw, 38px); color: #FFFFFF; line-height: 1.08; letter-spacing: -0.01em; white-space: pre-line; text-transform: uppercase; }
  .headline-data { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: clamp(64px, 18vw, 100px); color: #FFFFFF; line-height: 0.9; letter-spacing: -0.03em; text-transform: uppercase; }
  .highlight { background: rgba(255,255,255,0.22); border-radius: 2px; padding: 0 3px; color: #FFFFFF; }
  .subtext { font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 10px; letter-spacing: 0.03em; line-height: 1.45; }
  .watermark { position: absolute; bottom: 10px; right: 12px; font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 8px; color: rgba(255,255,255,0.25); letter-spacing: 0.2em; z-index: 2; }
  .slide-meta { background: #111; border-radius: 0 0 8px 8px; padding: 14px 16px; border: 1px solid #1e1e1e; border-top: none; }
  .meta-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #E8603C; letter-spacing: 0.15em; margin-bottom: 4px; }
  .meta-text { font-size: 11px; color: #777; line-height: 1.5; }
  .prompt-box { background: #0A0A0A; border: 1px solid #1e1e1e; border-radius: 6px; padding: 14px; margin-top: 12px; }
  .prompt-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #4A9EFF; letter-spacing: 0.15em; margin-bottom: 8px; }
  .prompt-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #999; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
  .caption-section { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 20px; margin-top: 40px; }
  .caption-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #E8603C; letter-spacing: 0.15em; margin-bottom: 10px; }
  .caption-text { font-size: 13px; color: #ccc; line-height: 1.7; white-space: pre-line; }
  .footer { text-align: center; padding: 40px 0 20px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #333; letter-spacing: 0.15em; }
  hr { border: none; border-top: 1px solid #1a1a1a; margin: 32px 0; }
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-brand">DQEF · AI CARROSSÉIS</div>
  <div class="topbar-meta">GERADO EM ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()} · ${carousel.angle} ${carousel.angleEmoji}</div>
</div>
<div class="container">
  <div class="carousel-title">${carousel.title}</div>
  <div class="carousel-meta">ÂNGULO: ${carousel.angleEmoji} ${carousel.angle} · PERFIL: ${carousel.targetProfile} · CANAL: ${carousel.channel}</div>
  <div class="carousel-meta" style="margin-top:4px;">⏰ ${carousel.bestTime}</div>
  <div class="viral-logic"><strong>→ LÓGICA VIRAL:</strong> ${carousel.viralLogic}</div>
  ${slidesHTML}
  <hr>
  <div class="caption-section">
    <div class="caption-label">CAPTION PARA COPIAR</div>
    <div class="caption-text">${carousel.caption.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
  <div class="footer">DQEF · DEIXA QUE EU FAÇO · FLORIANÓPOLIS · ${new Date().getFullYear()}</div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dqef-carrossel-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Draft Types ──────────────────────────────────────────────────────────────

interface FeedbackRequest {
  id: string;
  requested_by: string;
  requested_by_name: string;
  requested_to: string;
  requested_to_name: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  reply?: string;
  created_at: string;
  replied_at?: string;
}

interface CreativeDraft {
  id: string;
  user_id: string;
  sigla: string;
  name: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  context?: string;
  angle?: string;
  persona?: string;
  channel?: string;
  tone?: string;
  format_id?: string;
  carousel_data?: CarouselOutput;
  slide_images?: Record<number, string>;
  feedback_requests?: FeedbackRequest[];
  campaign_name?: string;
  workflow_stage?: string;
  created_at: string;
  updated_at: string;
}

const TEAM_MEMBERS = [
  { name: 'Gabriel', email: 'gabriel@dqef.com.br', role: 'CMO' },
  { name: 'Guilherme', email: 'guilherme@dqef.com.br', role: 'Diretor Criativo' },
  { name: 'Marcelo', email: 'marcelo@dqef.com.br', role: 'CFO' },
  { name: 'Leandro', email: 'leandro@dqef.com.br', role: 'CEO' },
  { name: 'Gustavo', email: 'gustavo@dqef.com.br', role: 'Dev' },
];

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-muted/60 text-muted-foreground border-border', icon: <Clock className="h-3 w-3" /> },
  review: { label: 'Em revisão', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: <MessageSquare className="h-3 w-3" /> },
  approved: { label: 'Aprovado', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <XCircle className="h-3 w-3" /> },
};

// ─── DraftsPanel ──────────────────────────────────────────────────────────────

interface DraftsPanelProps {
  userId: string | null;
  currentUserName: string;
  onLoadDraft: (draft: CreativeDraft) => void;
  refreshTrigger: number;
}

function DraftsPanel({ userId, currentUserName, onLoadDraft, refreshTrigger }: DraftsPanelProps) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<CreativeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<CreativeDraft | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('creative_drafts')
      .select('id, user_id, sigla, name, status, context, angle, persona, channel, tone, format_id, campaign_name, workflow_stage, feedback_requests, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (!error && data) setDrafts(data as unknown as CreativeDraft[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts, refreshTrigger]);

  const handleDelete = async (draft: CreativeDraft) => {
    if (draft.user_id !== userId) {
      toast({ title: 'Sem permissão', description: 'Apenas o criador pode excluir o draft.', variant: 'destructive' });
      return;
    }
    await supabase.from('creative_drafts').delete().eq('id', draft.id);
    toast({ title: 'Draft excluído', description: draft.sigla });
    setSelectedDraft(null);
    fetchDrafts();
  };

  const handleRequestFeedback = async () => {
    if (!selectedDraft || !feedbackMessage.trim() || !selectedReviewer) return;
    setSendingFeedback(true);
    try {
      const reviewer = TEAM_MEMBERS.find(m => m.name === selectedReviewer)!;
      const newRequest: FeedbackRequest = {
        id: crypto.randomUUID(),
        requested_by: userId!,
        requested_by_name: currentUserName,
        requested_to: reviewer.name,
        requested_to_name: reviewer.name,
        message: feedbackMessage.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const existingRequests = selectedDraft.feedback_requests ?? [];
      const updatedRequests = [...existingRequests, newRequest];

      const { error } = await supabase
        .from('creative_drafts')
        .update({ feedback_requests: updatedRequests as any, status: 'review' })
        .eq('id', selectedDraft.id);

      if (error) throw error;

      toast({ title: `Feedback solicitado ✅`, description: `${reviewer.name} (${reviewer.role}) foi notificado.` });
      setFeedbackMessage('');
      setSelectedReviewer('');
      fetchDrafts();
      setSelectedDraft(prev => prev ? { ...prev, feedback_requests: updatedRequests, status: 'review' } : null);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleReply = async (draft: CreativeDraft, requestId: string, status: 'approved' | 'rejected') => {
    const reply = replyText[requestId]?.trim() ?? '';
    const updatedRequests = (draft.feedback_requests ?? []).map(r =>
      r.id === requestId
        ? { ...r, status, reply, replied_at: new Date().toISOString() }
        : r
    );

    const allApproved = updatedRequests.every(r => r.status === 'approved');
    const anyRejected = updatedRequests.some(r => r.status === 'rejected');
    const newDraftStatus = allApproved ? 'approved' : anyRejected ? 'rejected' : 'review';

    const { error } = await supabase
      .from('creative_drafts')
      .update({ feedback_requests: updatedRequests as any, status: newDraftStatus })
      .eq('id', draft.id);

    if (!error) {
      toast({ title: status === 'approved' ? 'Aprovado ✅' : 'Rejeitado', description: `Resposta registrada.` });
      setReplyingTo(null);
      fetchDrafts();
      setSelectedDraft(prev => prev ? { ...prev, feedback_requests: updatedRequests, status: newDraftStatus } : null);
    }
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />)}</div>;
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="rounded-2xl bg-muted/30 p-4"><BookMarked className="h-8 w-8 text-muted-foreground/40" /></div>
        <p className="text-sm font-medium text-muted-foreground">Nenhum draft salvo ainda</p>
        <p className="text-xs text-muted-foreground/60">Gere um carrossel e clique em "Salvar Draft"</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map(draft => {
        const cfg = STATUS_CONFIG[draft.status];
        const pendingForMe = (draft.feedback_requests ?? []).filter(
          r => r.requested_to_name === currentUserName && r.status === 'pending'
        );
        const isSelected = selectedDraft?.id === draft.id;

        return (
          <div key={draft.id} className={cn('rounded-xl border transition-all', isSelected ? 'border-primary bg-card' : 'border-border bg-card/50 hover:border-border/80')}>
            {/* Draft header */}
            <button className="w-full text-left px-4 py-3" onClick={() => setSelectedDraft(isSelected ? null : draft)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">{draft.sigla}</span>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5', cfg.color)}>
                      {cfg.icon}{cfg.label}
                    </span>
                    {pendingForMe.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">
                        <Inbox className="h-2.5 w-2.5" />
                        {pendingForMe.length} para você
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground mt-1 truncate">{draft.name}</p>
                  {draft.carousel_data && (
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                      {draft.carousel_data.angle} · {draft.channel ?? draft.carousel_data.channel} · {draft.carousel_data.slides?.length ?? 0} slides
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] text-muted-foreground/50">{new Date(draft.updated_at).toLocaleDateString('pt-BR')}</p>
                  {isSelected ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto mt-1" /> : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto mt-1" />}
                </div>
              </div>
            </button>

            {/* Draft detail */}
            {isSelected && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => onLoadDraft(draft)}>
                    <Eye className="h-3 w-3" /> Carregar draft
                  </Button>
                  {draft.user_id === userId && (
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(draft)}>
                      <Trash2 className="h-3 w-3" /> Excluir
                    </Button>
                  )}
                </div>

                {/* Campaign link info */}
                {draft.campaign_name && (
                  <div className="rounded-lg bg-muted/30 border border-border px-3 py-2">
                    <p className="text-[9px] font-bold text-muted-foreground/60 tracking-widest uppercase mb-0.5">Campanha</p>
                    <p className="text-xs text-foreground font-medium">{draft.campaign_name}</p>
                    {draft.workflow_stage && <p className="text-[10px] text-muted-foreground">Etapa: {draft.workflow_stage}</p>}
                  </div>
                )}

                {/* Feedback requests list */}
                {(draft.feedback_requests ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground/60 tracking-widest uppercase">Histórico de Feedback</p>
                    {(draft.feedback_requests ?? []).map(req => {
                      const isForMe = req.requested_to_name === currentUserName && req.status === 'pending';
                      const reqCfg = req.status === 'approved'
                        ? { bg: 'bg-green-500/10 border-green-500/20', icon: <CheckCircle className="h-3 w-3 text-green-400" /> }
                        : req.status === 'rejected'
                        ? { bg: 'bg-red-500/10 border-red-500/20', icon: <XCircle className="h-3 w-3 text-red-400" /> }
                        : { bg: 'bg-yellow-500/10 border-yellow-500/20', icon: <Clock className="h-3 w-3 text-yellow-400" /> };

                      return (
                        <div key={req.id} className={cn('rounded-lg border px-3 py-2.5 space-y-2', reqCfg.bg)}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {reqCfg.icon}
                                <span className="text-[10px] font-semibold text-foreground">{req.requested_to_name}</span>
                                <span className="text-[9px] text-muted-foreground/60">solicitado por {req.requested_by_name}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 italic">"{req.message}"</p>
                              {req.reply && (
                                <p className="text-[10px] text-foreground mt-1.5 border-l-2 border-primary pl-2">{req.reply}</p>
                              )}
                            </div>
                          </div>

                          {/* Reply area (shown if pending and it's for the current user) */}
                          {isForMe && (
                            <div className="space-y-1.5">
                              {replyingTo === req.id ? (
                                <>
                                  <textarea
                                    value={replyText[req.id] ?? ''}
                                    onChange={e => setReplyText(prev => ({ ...prev, [req.id]: e.target.value }))}
                                    placeholder="Escreva sua resposta..."
                                    rows={2}
                                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                                  />
                                  <div className="flex gap-1.5">
                                    <Button size="sm" className="text-[10px] h-6 px-2 gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleReply(draft, req.id, 'approved')}>
                                      <CheckCircle className="h-2.5 w-2.5" /> Aprovar
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={() => handleReply(draft, req.id, 'rejected')}>
                                      <XCircle className="h-2.5 w-2.5" /> Rejeitar
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-muted-foreground" onClick={() => setReplyingTo(null)}>
                                      Cancelar
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <Button size="sm" className="text-[10px] h-6 px-2 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setReplyingTo(req.id)}>
                                  <MessageSquare className="h-2.5 w-2.5" /> Responder
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Request new feedback form */}
                <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-[9px] font-bold text-muted-foreground/60 tracking-widest uppercase">Solicitar opinião</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_MEMBERS.filter(m => m.name !== currentUserName).map(m => (
                      <button
                        key={m.name}
                        onClick={() => setSelectedReviewer(selectedReviewer === m.name ? '' : m.name)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all',
                          selectedReviewer === m.name
                            ? 'bg-primary/15 border-primary text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m.name} <span className="opacity-60">· {m.role}</span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={feedbackMessage}
                    onChange={e => setFeedbackMessage(e.target.value)}
                    placeholder="O que precisa ser avaliado? Ex: 'Validar se o tom está alinhado com o pitch...'"
                    rows={2}
                    className="w-full rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <Button
                    size="sm"
                    disabled={!feedbackMessage.trim() || !selectedReviewer || sendingFeedback}
                    onClick={handleRequestFeedback}
                    className="w-full h-7 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40"
                  >
                    {sendingFeedback ? <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Send className="h-3 w-3" />}
                    Solicitar feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiCarrosseis() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [context, setContext] = useState('');
  const [angle, setAngle] = useState('');
  const [persona, setPersona] = useState('');
  const [channel, setChannel] = useState('Instagram Feed');
  const [tone, setTone] = useState('Peer-to-peer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ carousel: CarouselOutput; autonomous: boolean } | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<CreativeFormat>(CREATIVE_FORMATS[0]);
  const [textScale, setTextScale] = useState(1);
  const [selectedThemeId, setSelectedThemeId] = useState<CarouselThemeId>('brand-orange');
  const activeTheme = CAROUSEL_THEMES.find(t => t.id === selectedThemeId) ?? CAROUSEL_THEMES[0];
  const [imageOpacity, setImageOpacity] = useState(0.52);
  const [textPosition, setTextPosition] = useState<TextPosition>('bottom');
  const [headlineScale, setHeadlineScale] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const [imageOffsetY, setImageOffsetY] = useState(0);

  // ── Narrative mode state ──
  type CarouselMode = 'direto' | 'narrativa';
  const [carouselMode, setCarouselMode] = useState<CarouselMode>('direto');
  const [narrativeTopic, setNarrativeTopic] = useState('');
  const [narrativeAudienceAngle, setNarrativeAudienceAngle] = useState('');
  const [narrativeNumSlides, setNarrativeNumSlides] = useState(10);
  const [narrativeResult, setNarrativeResult] = useState<{ carousel: NarrativeCarousel; autonomous: boolean } | null>(null);
  const [narrativeSlideImages, setNarrativeSlideImages] = useState<Record<number, string>>({});
  const [narrativeGeneratingImage, setNarrativeGeneratingImage] = useState<Record<number, boolean>>({});
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeThemeId, setNarrativeThemeId] = useState<NarrativeThemeId>('editorial-dark');
  const [narrativePerSlideSettings, setNarrativePerSlideSettings] = useState<Record<number, PerSlideSettings>>({});
  const [narrativeResearchData, setNarrativeResearchData] = useState<string>('');
  const [narrativeResearchCitations, setNarrativeResearchCitations] = useState<string[]>([]);
  const [narrativeResearchLoading, setNarrativeResearchLoading] = useState(false);
  const [narrativeResearchFacts, setNarrativeResearchFacts] = useState<Array<{ claim: string; source: string; year: number; url: string; country: string }>>([]);
  const [narrativeVerification, setNarrativeVerification] = useState<Record<number, SlideVerification>>({});
  const [narrativeVerifying, setNarrativeVerifying] = useState(false);

  // Per-slide image state
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [generatingImage, setGeneratingImage] = useState<Record<number, boolean>>({});

  // Media library state
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');

  // Drafts
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [draftsRefreshTrigger, setDraftsRefreshTrigger] = useState(0);
  const [lastSavedSigla, setLastSavedSigla] = useState<string | null>(null);
  const [strategyEnabled, setStrategyEnabled] = useState(true);
  const [campaignCtx, setCampaignCtx] = useState('');
  // Narrative drafts
  const [showNarrativeDraftModal, setShowNarrativeDraftModal] = useState(false);
  const [narrativeDraftName, setNarrativeDraftName] = useState('');
  const [savingNarrativeDraft, setSavingNarrativeDraft] = useState(false);

  // Load task context from campaign_tasks if taskId present
  useEffect(() => {
    if (!taskId) return;
    (async () => {
      const { data } = await (supabase as any).from('campaign_tasks').select('*').eq('id', taskId).single();
      if (data) {
        const ctx = data.campaign_context || {};
        const briefingParts = [
          ctx.objective && `📋 OBJETIVO: ${ctx.objective}`,
          ctx.campaignSummary && `📝 RESUMO: ${ctx.campaignSummary}`,
          ctx.keyMessage && `💡 MENSAGEM CENTRAL: ${ctx.keyMessage}`,
          ctx.emotionalAngle && `🎯 ÂNGULO: ${ctx.emotionalAngle}`,
          ctx.targetAudience && `👥 PÚBLICO: ${ctx.targetAudience}`,
          ctx.cta && `🔗 CTA: ${ctx.cta}`,
          ctx.hooks?.length > 0 && `🪝 HOOKS: ${ctx.hooks.join(' | ')}`,
          ctx.viralLogic && `🚀 LÓGICA VIRAL: ${ctx.viralLogic}`,
          ctx.toneGuidance && `🗣️ TOM: ${ctx.toneGuidance}`,
          ctx.avoid && `🚫 EVITAR: ${ctx.avoid}`,
          ctx.funnel && `🔄 FUNIL: ${ctx.funnel}`,
          ctx.channelBudget && `💰 VERBA DO CANAL: R$ ${Number(ctx.channelBudget).toLocaleString('pt-BR')}`,
        ].filter(Boolean).join('\n');
        if (briefingParts) setContext(briefingParts);
        if (ctx.emotionalAngle) setAngle(ctx.emotionalAngle);
        if (ctx.toneGuidance) setTone(ctx.toneGuidance);
        // Map channel
        if (data.channel) {
          const channelMap: Record<string, string> = {
            'Instagram': 'Instagram Feed',
            'TikTok': 'TikTok',
            'LinkedIn': 'LinkedIn',
            'Meta Ads': 'Instagram Feed',
            'YouTube': 'YouTube',
            'Orgânico': 'Instagram Feed',
          };
          setChannel(channelMap[data.channel] || 'Instagram Feed');
        }
        toast({ title: '📋 Briefing da campanha carregado', description: `Tarefa: ${data.title} · ${data.channel}` });
      }
    })();
  }, [taskId]);

  // Load reference from Instagram post (Canais Orgânicos → "Usar como Ref.")
  useEffect(() => {
    const raw = localStorage.getItem('ig_ref_to_carousel');
    if (!raw) return;
    try {
      const ref = JSON.parse(raw);
      const refBriefing = [
        '📌 REFERÊNCIA DE POST INSTAGRAM (usar como base criativa):',
        ref.caption && `Caption original: "${ref.caption.slice(0, 300)}"`,
        ref.engRate && `Engagement Rate: ${ref.engRate}%`,
        ref.likes && `Likes: ${ref.likes} | Saves: ${ref.saves} | Shares: ${ref.shares}`,
        ref.reach && `Alcance: ${ref.reach}`,
        ref.permalink && `Link: ${ref.permalink}`,
        '',
        '➡️ Crie um novo carrossel inspirado nesta referência, mantendo o que funcionou e melhorando o engajamento.',
      ].filter(Boolean).join('\n');
      setContext(refBriefing);
      setChannel('Instagram Feed');
      toast({ title: '📋 Referência do Instagram carregada', description: `Post ${ref.type} com ${ref.engRate}% de engagement` });
      localStorage.removeItem('ig_ref_to_carousel');
    } catch {}
  }, []);


  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user?.id) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', data.user.id).single();
        if (profile?.username) setCurrentUserName(profile.username);
      }
    });
  }, []);

  // Fetch library
  const fetchLibrary = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setLibrary(data as MediaItem[]);
  }, [userId]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Check for incoming suggestion from Ideação tab
  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (hasTriggeredRef.current) return;
    const raw = localStorage.getItem('ideacao_to_carousel');
    if (!raw) return;
    hasTriggeredRef.current = true;
    localStorage.removeItem('ideacao_to_carousel');
    try {
      const payload = JSON.parse(raw);
      if (payload.context) setContext(payload.context);
      if (payload.channel) setChannel(payload.channel);
      // Auto-generate after a short delay to let state settle
      setTimeout(() => {
        autoGenerateFromSuggestion(payload.context, payload.channel);
      }, 500);
    } catch { /* ignore */ }
  }, []);

  // Save draft handler
  const handleSaveDraft = async () => {
    if (!userId || !result) return;
    setSavingDraft(true);
    try {
      const sanitizedSlideImages = Object.fromEntries(
        Object.entries(slideImages).filter(([, url]) => !String(url || '').startsWith('data:image/'))
      );

      // Generate sigla via DB function
      const { data: siglaData, error: siglaErr } = await supabase.rpc('generate_draft_sigla');
      if (siglaErr) throw siglaErr;
      const sigla = siglaData as string;

      const name = draftName.trim() || result.carousel.title;

      const { error } = await supabase
        .from('creative_drafts')
        .insert({
          user_id: userId,
          sigla,
          name,
          status: 'draft',
          context,
          angle,
          persona,
          channel,
          tone,
          format_id: selectedFormat.id,
          carousel_data: result.carousel as any,
          slide_images: sanitizedSlideImages as any,
          feedback_requests: [] as any,
        });

      if (error) throw error;

      setLastSavedSigla(sigla);
      setShowSaveDraftModal(false);
      setDraftName('');
      setDraftsRefreshTrigger(t => t + 1);
      toast({
        title: `Draft salvo! ✅`,
        description: `Sigla: ${sigla} — disponível na aba Drafts.`,
      });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSavingDraft(false);
    }
  };

  // Load draft (direto + narrativa)
  const handleLoadDraft = useCallback(async (draft: CreativeDraft) => {
    const { data: fullDraft, error } = await supabase
      .from('creative_drafts')
      .select('carousel_data, slide_images')
      .eq('id', draft.id)
      .single();

    if (error || !fullDraft?.carousel_data) {
      toast({ title: 'Erro ao carregar draft', description: error?.message || 'Dados do draft indisponíveis', variant: 'destructive' });
      return;
    }

    const carouselData = fullDraft.carousel_data as any;
    const isNarrative = draft.name?.startsWith('[NAR]') ||
      (carouselData && typeof carouselData === 'object' && 'narrative_arc' in carouselData);

    if (isNarrative) {
      setCarouselMode('narrativa');
      const narCarousel = fullDraft.carousel_data as unknown as NarrativeCarousel;
      setNarrativeResult({ carousel: narCarousel, autonomous: false });
      setNarrativeSlideImages((fullDraft.slide_images as Record<number, string>) ?? {});
      // Restore theme from saved carousel data
      if (narCarousel.theme && narCarousel.theme in NARRATIVE_THEMES) {
        setNarrativeThemeId(narCarousel.theme as NarrativeThemeId);
      }
      if (draft.context !== undefined) setNarrativeTopic(draft.context ?? '');
      if (draft.angle !== undefined) setNarrativeAudienceAngle(draft.angle ?? '');
      if (draft.channel !== undefined) setChannel(draft.channel ?? 'Instagram Feed');
      if (draft.tone !== undefined) setTone(draft.tone ?? 'Peer-to-peer');
    } else {
      setCarouselMode('direto');
      setResult({ carousel: fullDraft.carousel_data as unknown as CarouselOutput, autonomous: false });
      setSlideImages((fullDraft.slide_images as Record<number, string>) ?? {});
      if (draft.context !== undefined) setContext(draft.context ?? '');
      if (draft.angle !== undefined) setAngle(draft.angle ?? '');
      if (draft.persona !== undefined) setPersona(draft.persona ?? '');
      if (draft.channel !== undefined) setChannel(draft.channel ?? 'Instagram Feed');
      if (draft.tone !== undefined) setTone(draft.tone ?? 'Peer-to-peer');
    }

    if (draft.format_id) {
      const fmt = CREATIVE_FORMATS.find(f => f.id === draft.format_id);
      if (fmt) setSelectedFormat(fmt);
    }

    setLastSavedSigla(draft.sigla);
    toast({ title: `Draft "${draft.sigla}" carregado ✅`, description: draft.name });
  }, [toast]);

  const autoGenerateFromSuggestion = async (suggestionContext: string, suggestionChannel?: string) => {
    setLoading(true);
    setResult(null);
    setSlideImages({});
    try {
      let strategyContext = '';
      try {
        const raw = localStorage.getItem('dqef_strategy_metafields_v1');
        if (raw) {
          const mf = JSON.parse(raw);
          strategyContext = mf.promptContext || '';
        }
      } catch { /* ignore */ }

      const { data, error } = await supabase.functions.invoke('generate-carousel-visual', {
        body: {
          context: suggestionContext,
          angle: '',
          persona: '',
          channel: suggestionChannel || 'Instagram Feed',
          tone: 'Peer-to-peer',
          strategyContext,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro na geração', description: data.error, variant: 'destructive' });
        return;
      }
      setResult(data);
      toast({ title: 'Carrossel gerado da sugestão! ✅', description: `${data.carousel.slides.length} lâminas prontas.` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao gerar carrossel. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setSlideImages({});
    try {
      // Inject strategy meta-fields if available
      let strategyContext = '';
      try {
        const raw = localStorage.getItem('dqef_strategy_metafields_v1');
        if (raw) {
          const mf = JSON.parse(raw);
          strategyContext = mf.promptContext || '';
        }
      } catch { /* ignore */ }

      const { data, error } = await supabase.functions.invoke('generate-carousel-visual', {
        body: { context: [campaignCtx, context].filter(Boolean).join('\n\n'), angle, persona, channel, tone, strategyContext },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro na geração', description: data.error, variant: 'destructive' });
        return;
      }
      setResult(data);
      toast({ title: 'Carrossel gerado! ✅', description: `${data.carousel.slides.length} lâminas prontas.` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao gerar carrossel. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = useCallback(async (slideNumber: number, prompt: string, quality: 'fast' | 'high') => {
    setGeneratingImage(prev => ({ ...prev, [slideNumber]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt: prompt, quality },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro na imagem', description: data.error, variant: 'destructive' });
        return;
      }
      if (data?.imageUrl) {
        let finalUrl = data.imageUrl;

        // If base64, upload to storage for persistence
        if (userId && finalUrl.startsWith('data:image/')) {
          try {
            const mimeMatch = finalUrl.match(/^data:(image\/\w+);base64,/);
            const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png';
            const base64Data = finalUrl.split(',')[1];
            const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const blob = new Blob([byteArray], { type: mimeMatch?.[1] || 'image/png' });
            const storagePath = `${userId}/ai-slide-${Date.now()}-${slideNumber}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from('media-library')
              .upload(storagePath, blob, { contentType: blob.type, upsert: false });
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);
              finalUrl = urlData.publicUrl;
            }
          } catch (uploadErr) {
            console.warn('Failed to upload AI image to storage, using base64:', uploadErr);
          }
        }

        setSlideImages(prev => ({ ...prev, [slideNumber]: finalUrl }));
        toast({ title: `Imagem gerada ✅`, description: `Lâmina ${slideNumber} atualizada.` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao gerar imagem. Tente novamente.', variant: 'destructive' });
    } finally {
      setGeneratingImage(prev => ({ ...prev, [slideNumber]: false }));
    }
  }, [toast, userId]);

  const handleClearImage = useCallback((slideNumber: number) => {
    setSlideImages(prev => {
      const next = { ...prev };
      delete next[slideNumber];
      return next;
    });
  }, []);

  const handleApplyLibraryImage = useCallback((slideNumber: number, url: string) => {
    setSlideImages(prev => ({ ...prev, [slideNumber]: url }));
    toast({ title: 'Imagem aplicada ✅', description: `Lâmina ${slideNumber} atualizada com imagem da biblioteca.` });
  }, [toast]);

  // ── Narrative mode handlers ──
  const handleGenerateNarrative = async () => {
    setNarrativeLoading(true);
    setNarrativeResult(null);
    setNarrativeSlideImages({});
    setNarrativeResearchData('');
    setNarrativeResearchCitations([]);
    setNarrativeResearchFacts([]);
    setNarrativeVerification({});
    try {
      let strategyContext = '';
      try {
        const raw = localStorage.getItem('dqef_strategy_metafields_v1');
        if (raw) strategyContext = JSON.parse(raw).promptContext || '';
      } catch { /* ignore */ }

      const topicText = [campaignCtx, narrativeTopic].filter(Boolean).join('\n\n');

      // Step 1: Research via Perplexity (if topic provided)
      let researchData = '';
      let researchCitations: string[] = [];
      if (topicText.trim()) {
        setNarrativeResearchLoading(true);
        toast({ title: '🔍 Pesquisando dados reais...', description: 'Buscando fontes verificáveis via Perplexity.' });
        try {
          const { data: researchResult, error: researchError } = await supabase.functions.invoke('research-topic', {
            body: { topic: topicText, audience: narrativeAudienceAngle },
          });
          if (!researchError && researchResult?.success) {
            researchData = researchResult.research;
            researchCitations = researchResult.citations || [];
            const structuredFacts = researchResult.facts || [];
            setNarrativeResearchData(researchData);
            setNarrativeResearchCitations(researchCitations);
            setNarrativeResearchFacts(structuredFacts);
            toast({ title: '✅ Pesquisa concluída', description: `${structuredFacts.length} fatos estruturados encontrados.` });
          } else {
            console.warn('Research failed, proceeding without:', researchError || researchResult?.error);
            toast({ title: '⚠️ Pesquisa indisponível', description: 'Gerando sem dados verificados. Fontes serão estimativas.' });
          }
        } catch (e) {
          console.warn('Research error, proceeding without:', e);
          toast({ title: '⚠️ Pesquisa indisponível', description: 'Gerando sem dados verificados.' });
        } finally {
          setNarrativeResearchLoading(false);
        }
      }

      // Step 2: Generate carousel with research data
      toast({ title: '✍️ Gerando carrossel narrativo...', description: researchData ? 'Usando dados verificados.' : 'Sem pesquisa prévia.' });
      const { data, error } = await supabase.functions.invoke('generate-narrative-carousel', {
        body: {
          topic: topicText,
          audience_angle: narrativeAudienceAngle,
          tone: tone,
          channel,
          strategyContext,
          num_slides: narrativeNumSlides,
          researchData,
          researchCitations,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        return;
      }
      setNarrativeResult(data);
      toast({ title: 'Carrossel narrativo gerado! ✅', description: `${data.carousel.slides.length} lâminas ${researchData ? 'com dados verificados' : 'com estimativas'}.` });

      // Step 3: Auto-verify if we have structured facts
      if (narrativeResearchFacts.length > 0 && data?.carousel?.slides?.length) {
        setNarrativeVerifying(true);
        toast({ title: '🔎 Verificando dados...', description: 'Cross-checking claims com fontes originais.' });
        try {
          const { data: verifyResult } = await supabase.functions.invoke('verify-carousel-facts', {
            body: {
              slides: data.carousel.slides.map((s: any) => ({ number: s.number, headline: s.headline, bodyText: s.bodyText })),
              facts: narrativeResearchFacts,
            },
          });
          if (verifyResult?.success && verifyResult.verification) {
            const verMap: Record<number, any> = {};
            verifyResult.verification.forEach((v: any) => { verMap[v.slideNumber] = v; });
            setNarrativeVerification(verMap);
            const verified = verifyResult.verification.filter((v: any) => v.overallStatus === 'verified').length;
            const total = verifyResult.verification.filter((v: any) => v.overallStatus !== 'no-data').length;
            toast({ title: '✅ Verificação concluída', description: `${verified}/${total} slides com dados 100% verificados.` });
          }
        } catch (e) {
          console.warn('Verification failed:', e);
        } finally {
          setNarrativeVerifying(false);
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao gerar carrossel narrativo.', variant: 'destructive' });
    } finally {
      setNarrativeLoading(false);
    }
  };

  const handleNarrativeGenerateImage = useCallback(async (slideNumber: number, prompt: string, quality: 'fast' | 'high') => {
    setNarrativeGeneratingImage(prev => ({ ...prev, [slideNumber]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-slide-image', {
        body: { imagePrompt: prompt, quality },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro na imagem', description: data.error, variant: 'destructive' });
        return;
      }
      if (data?.imageUrl) {
        let finalUrl = data.imageUrl;
        if (userId && finalUrl.startsWith('data:image/')) {
          try {
            const mimeMatch = finalUrl.match(/^data:(image\/\w+);base64,/);
            const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png';
            const base64Data = finalUrl.split(',')[1];
            const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const blob = new Blob([byteArray], { type: mimeMatch?.[1] || 'image/png' });
            const storagePath = `${userId}/narrative-slide-${Date.now()}-${slideNumber}.${ext}`;
            const { error: upErr } = await supabase.storage.from('media-library').upload(storagePath, blob, { contentType: blob.type });
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('media-library').getPublicUrl(storagePath);
              finalUrl = urlData.publicUrl;
            }
          } catch { /* use base64 */ }
        }
        setNarrativeSlideImages(prev => ({ ...prev, [slideNumber]: finalUrl }));
        toast({ title: `Imagem gerada ✅`, description: `Lâmina ${slideNumber} atualizada.` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao gerar imagem.', variant: 'destructive' });
    } finally {
      setNarrativeGeneratingImage(prev => ({ ...prev, [slideNumber]: false }));
    }
  }, [toast, userId]);

  const handleNarrativeClearImage = useCallback((slideNumber: number) => {
    setNarrativeSlideImages(prev => { const n = { ...prev }; delete n[slideNumber]; return n; });
  }, []);

  const handleNarrativeApplyImage = useCallback((slideNumber: number, url: string) => {
    setNarrativeSlideImages(prev => ({ ...prev, [slideNumber]: url }));
  }, []);

  const handleNarrativeUpdateSlide = useCallback((slideNumber: number, updates: Partial<NarrativeSlide>) => {
    setNarrativeResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        carousel: {
          ...prev.carousel,
          slides: prev.carousel.slides.map(s =>
            s.number === slideNumber ? { ...s, ...updates } : s
          ),
        },
      };
    });
  }, []);

  // ── Narrative draft save ──

  const handleSaveNarrativeDraft = async () => {
    if (!userId) {
      toast({ title: 'Faça login para salvar drafts', variant: 'destructive' });
      return;
    }
    if (!narrativeResult) {
      toast({ title: 'Gere um carrossel narrativo antes de salvar', variant: 'destructive' });
      return;
    }

    setSavingNarrativeDraft(true);
    try {
      const sanitizedNarrativeSlideImages = Object.fromEntries(
        Object.entries(narrativeSlideImages).filter(([, url]) => !String(url || '').startsWith('data:image/'))
      );

      const { data: siglaData, error: siglaErr } = await supabase.rpc('generate_draft_sigla');
      if (siglaErr) throw siglaErr;
      const sigla = siglaData as string;
      const name = narrativeDraftName.trim() || narrativeResult.carousel.title;

      const { error } = await supabase
        .from('creative_drafts')
        .insert({
          user_id: userId,
          sigla,
          name: `[NAR] ${name}`,
          status: 'draft',
          workflow_stage: 'narrativa',
          context: narrativeTopic,
          angle: narrativeAudienceAngle,
          channel,
          tone,
          format_id: selectedFormat.id,
          carousel_data: narrativeResult.carousel as any,
          slide_images: sanitizedNarrativeSlideImages as any,
          feedback_requests: [] as any,
        });
      if (error) throw error;

      setLastSavedSigla(sigla);
      setShowNarrativeDraftModal(false);
      setNarrativeDraftName('');
      setDraftsRefreshTrigger(t => t + 1);
      toast({ title: `Draft narrativo salvo! ✅`, description: `Sigla: ${sigla} — disponível na aba Drafts.` });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSavingNarrativeDraft(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>

      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Carrosséis</h1>
              <p className="text-sm text-muted-foreground">Gere carrosséis completos com arte visual, copy e prompts de imagem por lâmina</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setCarouselMode('direto')}
              className={cn(
                'px-4 py-2 text-xs font-bold transition-all flex items-center gap-2',
                carouselMode === 'direto'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Direto
            </button>
            <button
              onClick={() => setCarouselMode('narrativa')}
              className={cn(
                'px-4 py-2 text-xs font-bold transition-all flex items-center gap-2',
                carouselMode === 'narrativa'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <BookText className="h-3.5 w-3.5" />
              Narrativa
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
             MODO DIRETO — carrossel padrão 5 slides
            ══════════════════════════════════════════════════════════════════ */}
        {carouselMode === 'direto' && (
        <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">

          {/* ── LEFT: Briefing + Biblioteca tabs ── */}
          <div className="space-y-4">
            <Tabs defaultValue="briefing">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="briefing" className="text-xs">Briefing</TabsTrigger>
                <TabsTrigger value="estrategia" className="flex items-center gap-1 text-xs">
                  <Target className="h-3 w-3" />
                  Estratégia
                </TabsTrigger>
                <TabsTrigger value="biblioteca" className="flex items-center gap-1.5 text-xs">
                  Biblioteca
                  {library.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold min-w-[16px] h-4 px-1">
                      {library.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="drafts" className="flex items-center gap-1 text-xs">
                  <BookMarked className="h-3 w-3" />
                  Drafts
                </TabsTrigger>
              </TabsList>

              {/* ── BRIEFING TAB ── */}
              <TabsContent value="briefing">
                <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                  {/* Campaign as knowledge base */}
                  <CampaignKnowledgeSelector onContextChange={setCampaignCtx} />

                  <div>
                    <p className="text-xs font-bold text-primary tracking-widest mb-3">CONTEXTO ESTRATÉGICO</p>
                    <Textarea
                      placeholder="Descreva a ideia, ângulo ou deixe em branco para a IA criar do zero..."
                      value={context}
                      onChange={e => setContext(e.target.value)}
                      className="min-h-[90px] text-sm resize-none bg-muted/30 border-border/60"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Wand2 className="h-3 w-3" />
                      Se vazio, a IA escolhe o ângulo estratégico ideal agora
                    </p>
                  </div>

                  {/* Angle */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">ÂNGULO</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ANGLES.map(a => (
                        <button
                          key={a.id}
                          onClick={() => setAngle(a.id)}
                          className={cn(
                            'rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all',
                            angle === a.id
                              ? 'bg-primary/15 border-primary text-primary'
                              : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                          )}
                        >
                          {a.emoji} {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Persona */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">PERFIL-ALVO</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PERSONAS.map(p => (
                        <button
                          key={p}
                          onClick={() => setPersona(persona === p ? '' : p)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all text-left',
                            persona === p
                              ? 'bg-primary/15 border-primary text-primary'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Channel */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">CANAL</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CHANNELS.map(c => (
                        <button
                          key={c}
                          onClick={() => setChannel(c)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                            channel === c
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">TOM</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TONES.map(t => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                            tone === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme picker */}
                  <ThemePicker selected={selectedThemeId} onChange={setSelectedThemeId} />

                  {/* Format selector */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">FORMATO DE SAÍDA</p>
                    <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                      O PNG exportado terá exatamente essas dimensões com zonas de segurança aplicadas.
                    </p>
                    {/* Group by platform */}
                    {Array.from(new Set(CREATIVE_FORMATS.map(f => f.platform))).map(platform => (
                      <div key={platform} className="mb-3">
                        <p className="text-[9px] font-bold text-muted-foreground/50 tracking-[0.15em] uppercase mb-1.5">{platform}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CREATIVE_FORMATS.filter(f => f.platform === platform).map(fmt => (
                            <button
                              key={fmt.id}
                              onClick={() => setSelectedFormat(fmt)}
                              title={`${fmt.width}×${fmt.height}px${fmt.notes ? ' — ' + fmt.notes : ''}`}
                              className={cn(
                                'group relative rounded-lg border px-2.5 py-1.5 text-left transition-all',
                                selectedFormat.id === fmt.id
                                  ? 'border-primary bg-primary/15 text-primary'
                                  : 'border-border text-muted-foreground hover:border-border/70 hover:text-foreground'
                              )}
                            >
                              {/* Aspect ratio mini-preview */}
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'rounded-sm border flex-shrink-0',
                                    selectedFormat.id === fmt.id ? 'border-primary bg-primary/30' : 'border-border bg-muted/40'
                                  )}
                                  style={{
                                    width: Math.round(Math.min(22, 22 * (fmt.width / fmt.height))),
                                    height: Math.round(Math.min(22, 22 * (fmt.height / fmt.width))),
                                  }}
                                />
                                <div>
                                  <p className="text-[10px] font-semibold leading-none">{fmt.label}</p>
                                  <p className="text-[9px] text-muted-foreground/70 leading-none mt-0.5">{fmt.width}×{fmt.height}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* Selected format info */}
                    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-primary">{selectedFormat.platform} · {selectedFormat.label}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedFormat.width}×{selectedFormat.height}px · {selectedFormat.ratio}</p>
                      </div>
                      {selectedFormat.notes && (
                        <p className="text-[9px] text-muted-foreground italic max-w-[120px] text-right leading-snug">{selectedFormat.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* ── Fundação Estratégica ── */}
                  <StrategyInputSection userId={userId} strategyEnabled={strategyEnabled} setStrategyEnabled={setStrategyEnabled} />

                  {/* Strategic Review Button */}
                  <StrategicReviewButton userId={userId} />

                  {/* Generate button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Gerando carrossel...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        Gerar Carrossel
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* ── ESTRATÉGIA TAB ── */}
              <TabsContent value="estrategia">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Playbook Estratégico</p>
                      <p className="text-[10px] text-muted-foreground">Contexto que alimenta a IA em todas as gerações</p>
                    </div>
                  </div>
                  <StrategicPanel />
                </div>
              </TabsContent>

              {/* ── BIBLIOTECA TAB ── */}
              <TabsContent value="biblioteca">
                <div className="rounded-xl border border-border bg-card p-5">
                  <MediaLibraryPanel
                    userId={userId}
                    library={library}
                    onLibraryChange={fetchLibrary}
                  />
                </div>
              </TabsContent>

              {/* ── DRAFTS TAB ── */}
              <TabsContent value="drafts">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <BookMarked className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Meus Drafts</p>
                      <p className="text-[10px] text-muted-foreground">Rascunhos salvos e revisões do time</p>
                    </div>
                  </div>
                  <DraftsPanel
                    userId={userId}
                    currentUserName={currentUserName}
                    onLoadDraft={handleLoadDraft}
                    refreshTrigger={draftsRefreshTrigger}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── RIGHT: Output ── */}
          <div>
            {!result && !loading && (
              <div className="h-full min-h-[400px] rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-3 text-center p-8">
                <div className="rounded-2xl bg-primary/10 p-4">
                  <Layers className="h-8 w-8 text-primary/60" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Nenhum carrossel gerado ainda</p>
                  <p className="text-sm text-muted-foreground max-w-xs">Preencha o briefing ao lado ou deixe em branco — a IA escolhe o ângulo estratégico ideal para Fevereiro 2026.</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="rounded-xl bg-muted/20 animate-pulse" style={{ aspectRatio: '4/5' }} />
                  ))}
                </div>
              </div>
            )}

            {result && !loading && (
              <div>
                {result.autonomous && <AngleRecommendation carousel={result.carousel} />}

                <div className="mb-5">
                  <h2 className="text-2xl font-black tracking-tight text-foreground mb-2 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                    {result.carousel.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono mb-2">
                    <span>ÂNGULO: {result.carousel.angleEmoji} {result.carousel.angle}</span>
                    <span>·</span>
                    <span>PERFIL: {result.carousel.targetProfile}</span>
                    <span>·</span>
                    <span>CANAL: {result.carousel.channel}</span>
                    <span>·</span>
                    <span>⏰ {result.carousel.bestTime}</span>
                  </div>
                  <div className="text-xs text-muted-foreground border-l-2 border-primary pl-3">
                    <span className="font-semibold text-primary">→ LÓGICA VIRAL:</span> {result.carousel.viralLogic}
                  </div>
                </div>

                {/* Layout Controls */}
                <div className="space-y-2 mb-4">
                  {/* Text size + theme */}
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase whitespace-nowrap">Texto</span>
                    <span className="text-[10px] text-muted-foreground">A</span>
                    <Slider value={[textScale]} onValueChange={([v]) => setTextScale(v)} min={0.5} max={2} step={0.05} className="flex-1" />
                    <span className="text-sm font-bold text-muted-foreground">A</span>
                    <span className="text-[10px] font-mono text-primary min-w-[36px] text-right">{Math.round(textScale * 100)}%</span>
                    <div className="h-4 w-px bg-border mx-1" />
                    <div className="flex gap-1">
                      {CAROUSEL_THEMES.map(t => (
                        <button key={t.id} onClick={() => setSelectedThemeId(t.id)} title={t.label}
                          className={cn('h-5 w-5 rounded-full border-2 transition-all flex-shrink-0', selectedThemeId === t.id ? 'border-primary scale-110' : 'border-border hover:border-muted-foreground')}
                          style={{ background: t.previewSwatch[0] }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Text position + headline size */}
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase whitespace-nowrap">Posição</span>
                    <div className="flex gap-1">
                      {([['top', '↑'], ['center', '↔'], ['bottom', '↓']] as [TextPosition, string][]).map(([pos, icon]) => (
                        <button key={pos} onClick={() => setTextPosition(pos)}
                          className={cn('h-6 w-8 rounded text-xs font-bold border transition-all', textPosition === pos ? 'bg-primary/15 border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
                        >{icon}</button>
                      ))}
                    </div>
                    <div className="h-4 w-px bg-border mx-1" />
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase whitespace-nowrap">Headline</span>
                    <Slider value={[headlineScale]} onValueChange={([v]) => setHeadlineScale(v)} min={0.5} max={2.5} step={0.1} className="flex-1" />
                    <span className="text-[10px] font-mono text-primary min-w-[36px] text-right">{Math.round(headlineScale * 100)}%</span>
                  </div>

                  {/* Image controls */}
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase whitespace-nowrap">Imagem</span>
                    <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <Slider value={[imageOpacity]} onValueChange={([v]) => setImageOpacity(v)} min={0.1} max={1} step={0.05} className="flex-1" />
                    <span className="text-[10px] font-mono text-primary min-w-[36px] text-right">{Math.round(imageOpacity * 100)}%</span>
                  </div>

                  {/* Image zoom + position */}
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase whitespace-nowrap">Zoom</span>
                    <Slider value={[imageScale]} onValueChange={([v]) => setImageScale(v)} min={0.5} max={3} step={0.1} className="flex-1" />
                    <span className="text-[10px] font-mono text-primary min-w-[30px] text-right">{Math.round(imageScale * 100)}%</span>
                    <div className="h-4 w-px bg-border mx-1" />
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase whitespace-nowrap">Y</span>
                    <Slider value={[imageOffsetY]} onValueChange={([v]) => setImageOffsetY(v)} min={-50} max={50} step={1} className="flex-1" />
                    <span className="text-[10px] font-mono text-primary min-w-[30px] text-right">{imageOffsetY > 0 ? '+' : ''}{imageOffsetY}</span>
                  </div>
                </div>

                {/* Slides grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 mb-6">
                  {result.carousel.slides.map(slide => (
                    <SlideCard
                      key={slide.number}
                      slide={slide}
                      imageUrl={slideImages[slide.number]}
                      isGenerating={generatingImage[slide.number]}
                      onGenerateImage={handleGenerateImage}
                      onClearImage={handleClearImage}
                      onApplyLibraryImage={handleApplyLibraryImage}
                      mediaLibraryCount={library.length}
                      userId={userId}
                      onLibraryChange={fetchLibrary}
                      format={selectedFormat}
                      textScale={textScale}
                      theme={activeTheme}
                      imageOpacity={imageOpacity}
                      textPosition={textPosition}
                      headlineScale={headlineScale}
                      imageScale={imageScale}
                      imageOffsetY={imageOffsetY}
                    />
                  ))}
                </div>

                {/* Caption + actions */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-primary tracking-widest">CAPTION</p>
                    <CopyButton text={result.carousel.caption} label="Copiar caption" />
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {result.carousel.caption}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allText = result.carousel.slides.map(s =>
                          `SLIDE ${s.number} — ${TYPE_LABELS[s.type]}:\n${s.headline}\n${s.subtext ?? ''}\n→ LÓGICA: ${s.logic}`
                        ).join('\n\n');
                        navigator.clipboard.writeText(allText);
                        toast({ title: 'Copiado!', description: 'Todo o roteiro copiado.' });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copiar tudo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => setShowSaveDraftModal(true)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar Draft
                      {lastSavedSigla && <span className="text-[9px] opacity-70">({lastSavedSigla})</span>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-green-500/40 text-green-600 hover:bg-green-500/10"
                      onClick={async () => {
                        if (!userId || !result) return;
                        // Use first slide image or generate a placeholder
                        const firstSlideImg = slideImages[1];
                        if (!firstSlideImg) {
                          toast({ title: 'Sem imagem', description: 'Adicione uma imagem à primeira lâmina antes de enviar ao grid.', variant: 'destructive' });
                          return;
                        }
                        // Get current max grid position
                        const { data: gridItems } = await supabase
                          .from('active_creatives')
                          .select('grid_position')
                          .not('grid_position', 'is', null)
                          .order('grid_position', { ascending: false })
                          .limit(1);
                        const nextPos = (gridItems?.[0]?.grid_position ?? -1) + 1;
                        const { error } = await supabase.from('active_creatives').insert({
                          user_id: userId,
                          title: result.carousel.title,
                          file_url: firstSlideImg,
                          thumbnail_url: firstSlideImg,
                          platform: 'Instagram',
                          format_type: 'Carrossel',
                          status: 'active',
                          grid_position: nextPos,
                        });
                        if (!error) {
                          toast({ title: '📱 Enviado para o Grid!', description: 'A capa do carrossel foi adicionada ao Grid Instagram.' });
                        } else {
                          toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                        }
                      }}
                    >
                      <Grid3x3 className="h-3.5 w-3.5" />
                      Enviar para Grid
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => exportCarouselHTML(result.carousel, slideImages)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Exportar HTML
                    </Button>
                  </div>
                </div>

                {/* Save Draft Modal */}
                {showSaveDraftModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-primary/10 p-1.5">
                            <Save className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">Salvar Draft</p>
                            <p className="text-[10px] text-muted-foreground">Uma sigla única será gerada automaticamente</p>
                          </div>
                        </div>
                        <button onClick={() => setShowSaveDraftModal(false)} className="rounded-full p-1 hover:bg-muted transition-colors">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">Nome do draft</p>
                        <input
                          value={draftName}
                          onChange={e => setDraftName(e.target.value)}
                          placeholder={result.carousel.title}
                          className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <p className="text-[10px] text-muted-foreground/50">Se vazio, usará o título do carrossel</p>
                      </div>

                      <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5 space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground/60 tracking-widest uppercase">O que será salvo</p>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>✅ Carrossel completo ({result.carousel.slides.length} slides)</p>
                          <p>✅ Caption e lógica viral</p>
                          <p>✅ Briefing (ângulo, persona, canal, tom)</p>
                          <p>✅ Formato selecionado ({selectedFormat.label})</p>
                          {Object.keys(slideImages).length > 0 && <p>✅ {Object.keys(slideImages).length} imagem(ns) aplicada(s)</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={() => setShowSaveDraftModal(false)}>
                          Cancelar
                        </Button>
                        <Button
                          disabled={savingDraft}
                          onClick={handleSaveDraft}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                        >
                          {savingDraft
                            ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <Save className="h-3.5 w-3.5" />}
                          {savingDraft ? 'Salvando...' : 'Salvar Draft'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
             MODO NARRATIVA — carrossel editorial 7-10 slides
            ══════════════════════════════════════════════════════════════════ */}
        {carouselMode === 'narrativa' && (
          <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
            {/* ── LEFT: Narrative Briefing ── */}
            <div className="space-y-4">
              <Tabs defaultValue="briefing">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="briefing" className="text-xs">Briefing</TabsTrigger>
                  <TabsTrigger value="drafts" className="flex items-center gap-1 text-xs">
                    <BookMarked className="h-3 w-3" />
                    Drafts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="briefing">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <BookText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Carrossel Narrativo</p>
                        <p className="text-[10px] text-muted-foreground">Storytelling editorial profundo · 7-10 lâminas</p>
                      </div>
                    </div>

                    <CampaignKnowledgeSelector onContextChange={setCampaignCtx} />

                    <div>
                      <p className="text-xs font-bold text-primary tracking-widest mb-3">TEMA / TÓPICO</p>
                      <Textarea
                        placeholder="Ex: O fim do American Dream e a ascensão do Sonho Brasileiro..."
                        value={narrativeTopic}
                        onChange={e => setNarrativeTopic(e.target.value)}
                        className="min-h-[100px] text-sm resize-none bg-muted/30 border-border/60"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Wand2 className="h-3 w-3" />
                        Se vazio, a IA escolhe um tema trending relevante
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">ÂNGULO DE AUDIÊNCIA</p>
                      <Textarea
                        placeholder="Como esse conteúdo se conecta com os desejos do público DQEF? (opcional)"
                        value={narrativeAudienceAngle}
                        onChange={e => setNarrativeAudienceAngle(e.target.value)}
                        className="min-h-[60px] text-sm resize-none bg-muted/30 border-border/60"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">NÚMERO DE SLIDES</p>
                      <div className="flex items-center gap-3">
                        <Slider value={[narrativeNumSlides]} onValueChange={([v]) => setNarrativeNumSlides(v)} min={7} max={10} step={1} className="flex-1" />
                        <span className="text-sm font-bold text-primary min-w-[30px] text-center">{narrativeNumSlides}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">CANAL</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CHANNELS.map(c => (
                          <button key={c} onClick={() => setChannel(c)}
                            className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-all',
                              channel === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                            )}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground tracking-widest mb-2.5">FORMATO DE SAÍDA</p>
                      {['Instagram', 'TikTok', 'LinkedIn'].map(platform => (
                        <div key={platform} className="mb-3">
                          <p className="text-[9px] font-bold text-muted-foreground/50 tracking-[0.15em] uppercase mb-1.5">{platform}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {CREATIVE_FORMATS.filter(f => f.platform === platform && (f.ratio === '4:5' || f.ratio === '3:4' || f.ratio === '1:1' || f.ratio === '9:16')).map(fmt => (
                              <button key={fmt.id} onClick={() => setSelectedFormat(fmt)}
                                className={cn('rounded-lg border px-2.5 py-1.5 text-left transition-all',
                                  selectedFormat.id === fmt.id ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                                )}>
                                <p className="text-[10px] font-semibold">{fmt.label}</p>
                                <p className="text-[9px] text-muted-foreground/70">{fmt.width}×{fmt.height}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleGenerateNarrative}
                      disabled={narrativeLoading}
                      className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      {narrativeLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        {narrativeResearchLoading ? '🔍 Pesquisando dados reais...' : narrativeVerifying ? '🔎 Verificando dados...' : '✍️ Gerando narrativa...'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <BookText className="h-4 w-4" />
                          Gerar Carrossel Narrativo
                        </span>
                      )}
                    </Button>

                    {narrativeResult && (
                      <Button
                        variant="outline"
                        className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => setShowNarrativeDraftModal(true)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Salvar Draft Narrativo
                        {lastSavedSigla && <span className="text-[9px] opacity-70">({lastSavedSigla})</span>}
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="drafts">
                  <DraftsPanel
                    userId={userId}
                    currentUserName={currentUserName}
                    onLoadDraft={handleLoadDraft}
                    refreshTrigger={draftsRefreshTrigger}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* ── RIGHT: Narrative Output ── */}
            <div>
              {!narrativeResult && !narrativeLoading && (
                <div className="h-full min-h-[400px] rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-3 text-center p-8">
                  <div className="rounded-2xl bg-primary/10 p-4">
                    <BookText className="h-8 w-8 text-primary/60" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Carrossel Narrativo</p>
                    <p className="text-sm text-muted-foreground max-w-sm">Crie carrosséis editoriais com storytelling profundo, dados com fontes e narrativa que prende a atenção. Inspirado nos melhores perfis de conteúdo informativo.</p>
                  </div>
                </div>
              )}

              {narrativeLoading && (
                <div className="space-y-4">
                  <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="rounded-xl bg-muted/20 animate-pulse" style={{ aspectRatio: '4/5' }} />
                    ))}
                  </div>
                </div>
              )}

              {narrativeResult && !narrativeLoading && (
                <div>
                  {/* Narrative header */}
                  <div className="mb-5 space-y-3">
                    <h2 className="text-2xl font-black tracking-tight text-foreground" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900 }}>
                      {narrativeResult.carousel.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span>TEMA: {narrativeResult.carousel.theme}</span>
                      <span>·</span>
                      <span>{narrativeResult.carousel.slides.length} slides</span>
                      <span>·</span>
                      <span>⏰ {narrativeResult.carousel.bestTime}</span>
                    </div>
                    <div className="text-xs text-muted-foreground border-l-2 border-primary pl-3 space-y-1">
                      <div><span className="font-semibold text-primary">→ ARCO NARRATIVO:</span> {narrativeResult.carousel.narrative_arc}</div>
                      <div><span className="font-semibold text-primary">→ CONEXÃO:</span> {narrativeResult.carousel.target_connection}</div>
                      <div><span className="font-semibold text-primary">→ COMPARTILHABILIDADE:</span> {narrativeResult.carousel.shareability_hook}</div>
                    </div>
                  </div>

                  {/* Theme picker */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(Object.keys(NARRATIVE_THEMES) as NarrativeThemeId[]).map(tid => {
                      const t = NARRATIVE_THEMES[tid];
                      return (
                        <button key={tid} onClick={() => setNarrativeThemeId(tid)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-left transition-all',
                            narrativeThemeId === tid ? 'border-primary bg-primary/15' : 'border-border hover:border-muted-foreground/30'
                          )}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-border" style={{ background: t.bg }} />
                            <span className="text-[10px] font-semibold text-foreground">{t.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Research citations */}
                  {narrativeResearchCitations.length > 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 mb-4">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-green-500 block">
                          ✅ Dados pesquisados via Perplexity — {narrativeResearchCitations.length} fontes verificadas
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {narrativeResearchCitations.slice(0, 8).map((url, i) => {
                            let domain = url;
                            try { domain = new URL(url).hostname.replace('www.', ''); } catch { /* keep raw */ }
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="text-[9px] text-green-500/70 hover:text-green-400 underline underline-offset-2 truncate max-w-[160px]">
                                [{i + 1}] {domain}
                              </a>
                            );
                          })}
                          {narrativeResearchCitations.length > 8 && (
                            <span className="text-[9px] text-green-500/50">+{narrativeResearchCitations.length - 8} mais</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 mb-4">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-yellow-500/80 leading-snug">
                        Dados e fontes são sugeridos pela IA e devem ser verificados antes da publicação. Para dados verificados, gere com um tema definido.
                      </span>
                    </div>
                  )}

                  {/* Slides grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {narrativeResult.carousel.slides.map(slide => (
                      <NarrativeSlideCard
                        key={slide.number}
                        slide={slide}
                        imageUrl={narrativeSlideImages[slide.number]}
                        isGenerating={narrativeGeneratingImage[slide.number]}
                        onGenerateImage={handleNarrativeGenerateImage}
                        onClearImage={handleNarrativeClearImage}
                        onApplyImage={handleNarrativeApplyImage}
                        onUpdateSlide={handleNarrativeUpdateSlide}
                        userId={userId}
                        format={selectedFormat}
                        themeId={narrativeThemeId}
                        slideSettings={narrativePerSlideSettings[slide.number] || DEFAULT_SLIDE_SETTINGS}
                        onSettingsChange={(num, settings) => setNarrativePerSlideSettings(prev => ({ ...prev, [num]: settings }))}
                        verification={narrativeVerification[slide.number]}
                        researchFacts={narrativeResearchFacts}
                      />
                    ))}
                  </div>

                  {/* Caption */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary tracking-widest">CAPTION</p>
                      <CopyButton text={narrativeResult.carousel.caption} label="Copiar caption" />
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {narrativeResult.carousel.caption}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Button size="sm" variant="outline" onClick={() => {
                        const allText = narrativeResult.carousel.slides.map(s =>
                          `SLIDE ${s.number} — ${s.type.toUpperCase()}:\n${s.headline}\n${s.bodyText ?? ''}`
                        ).join('\n\n');
                        navigator.clipboard.writeText(allText);
                        toast({ title: 'Copiado!', description: 'Todo o roteiro copiado.' });
                      }}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar tudo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => setShowNarrativeDraftModal(true)}
                      >
                        <Save className="h-3.5 w-3.5" /> Salvar Draft
                        {lastSavedSigla && <span className="text-[9px] opacity-70">({lastSavedSigla})</span>}
                      </Button>
                    </div>
                  </div>

                  {/* Save Narrative Draft Modal */}
                  {showNarrativeDraftModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-foreground">Salvar Draft Narrativo</h3>
                          <button onClick={() => setShowNarrativeDraftModal(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Nome do Draft</label>
                          <input
                            type="text"
                            value={narrativeDraftName}
                            onChange={e => setNarrativeDraftName(e.target.value)}
                            placeholder={narrativeResult.carousel.title}
                            className="mt-1.5 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" className="flex-1" onClick={() => setShowNarrativeDraftModal(false)}>Cancelar</Button>
                          <Button
                            disabled={savingNarrativeDraft}
                            onClick={handleSaveNarrativeDraft}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                          >
                            {savingNarrativeDraft
                              ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <Save className="h-3.5 w-3.5" />}
                            {savingNarrativeDraft ? 'Salvando...' : 'Salvar Draft'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
