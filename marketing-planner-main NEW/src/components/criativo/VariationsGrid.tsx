import { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import AdjSlider from '@/components/criativo/AdjSlider';
import { supabase } from '@/integrations/supabase/client';
import {
  Download, Copy, Check, Trash2, ImageIcon, RefreshCw, Layers,
  Type, Palette, ChevronDown, SlidersHorizontal, Upload,
  CheckSquare, Square, Package, Wand2, Sparkles, Library
} from 'lucide-react';
import dqfIcon from '@/assets/dqf-icon.svg';
import type { CreativeFormat, CarouselTheme, CarouselThemeId } from '@/pages/AiCarrosseis';
import {
  type HighlightStyle, HIGHLIGHT_STYLES, type VisualStyle, VISUAL_STYLES,
  FONT_OPTIONS,
} from '@/pages/Criativo';
import { CAROUSEL_THEMES } from '@/pages/AiCarrosseis';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Shape System ────────────────────────────────────────────────────────────

export type ShapeStyle = 'none' | 'pill' | 'box' | 'diagonal' | 'gradient-bar' | 'circle-accent';
export type GraphicPreset = 'signal-frame' | 'editorial-grid' | 'spotlight-panel';

export const SHAPE_STYLES: { id: ShapeStyle; label: string; desc: string }[] = [
  { id: 'none', label: 'Sem Shape', desc: 'Texto direto sobre imagem' },
  { id: 'pill', label: 'Pill', desc: 'Fundo arredondado no headline' },
  { id: 'box', label: 'Box', desc: 'Caixa sólida com bordas retas' },
  { id: 'diagonal', label: 'Diagonal', desc: 'Faixa diagonal dinâmica' },
  { id: 'gradient-bar', label: 'Gradient Bar', desc: 'Barra gradiente na base' },
  { id: 'circle-accent', label: 'Círculo', desc: 'Destaque circular no highlight' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreativeVariation {
  id: string;
  headline: string;
  headlineHighlight?: string;
  subtext?: string;
  cta?: string;
  caption: string;
  angle: string;
  imageUrl?: string;
  imagePrompt?: string;
  shape: ShapeStyle;
  viralLogic?: string;
  textScale?: number;
  imageOpacity?: number;
  highlightStyle?: HighlightStyle;
  highlightWords?: string;
  highlightColor?: string;
  fontFamily?: string;
  textPositionX?: number;
  textPositionY?: number;
  ctaScale?: number;
  graphicPreset?: GraphicPreset;
  staticGraphicOnly?: boolean;
}

interface Props {
  variations: CreativeVariation[];
  onRemove: (id: string) => void;
  onUpdateVariation: (id: string, updates: Partial<CreativeVariation>) => void;
  onGenerateImage: (variationId: string, prompt: string) => void;
  onGenerateAllImages?: () => void;
  onSearchLibrary?: () => void;
  isSearchingLibrary?: boolean;
  librarySearchProgress?: { current: number; total: number; matches: number } | null;
  isGeneratingAllImages?: boolean;
  imageGenProgress?: { current: number; total: number } | null;
  onExportAll: () => void;
  format: CreativeFormat;
  theme: CarouselTheme;
  isGeneratingImage: string | null;
}

// ─── Highlight Renderer ─────────────────────────────────────────────────────

function renderHighlightedText(
  text: string,
  highlightWords: string | undefined,
  highlightStyle: HighlightStyle,
  headlineColor: string,
  highlightColor: string,
  isExport = false,
) {
  if (!highlightWords || highlightStyle === 'none' || !text) {
    return <span style={{ color: headlineColor }}>{text}</span>;
  }
  
  const words = highlightWords.split('|').map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return <span style={{ color: headlineColor }}>{text}</span>;
  
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  // Check if a part matches any highlight word (without using regex.test which resets lastIndex)
  const isHighlighted = (part: string) => words.some(w => w.toLowerCase() === part.toLowerCase());

  const getStyle = (): React.CSSProperties => {
    switch (highlightStyle) {
      case 'color':
        return { color: highlightColor };
      case 'bold':
        return {
          color: highlightColor,
          textShadow: `0 2px 14px ${highlightColor}88, 0 0 6px ${highlightColor}44`,
          WebkitTextStroke: '0.5px currentColor',
        };
      case 'box':
        return {
          color: '#FFFFFF',
          backgroundColor: highlightColor,
          borderRadius: isExport ? '6px' : '4px',
          padding: isExport ? '4px 12px' : '2px 8px',
          display: 'inline',
          boxDecorationBreak: 'clone' as any,
        };
      default:
        return { color: headlineColor };
    }
  };

  return (
    <>
      {parts.map((part, i) =>
        isHighlighted(part)
          ? <span key={i} style={getStyle()}>{part}</span>
          : <span key={i} style={{ color: headlineColor }}>{part}</span>
      )}
    </>
  );
}

// ─── Shape Renderer ─────────────────────────────────────────────────────────

function ShapeOverlay({ shape, theme, isExport = false }: { shape: ShapeStyle; theme: CarouselTheme; isExport?: boolean }) {
  const isDark = theme.id !== 'clean-white';
  const brandColor = '#E8603C';
  
  switch (shape) {
    case 'pill':
      return (
        <div style={{
          position: 'absolute', bottom: '8%', left: '5%', right: '5%',
          height: '18%', borderRadius: '999px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6))',
          backdropFilter: 'blur(16px)',
          border: `1.5px solid ${isDark ? 'rgba(232,96,60,0.3)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
          zIndex: 5,
        }} />
      );
    case 'box':
      return (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '45%',
          background: isDark
            ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)'
            : 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
          zIndex: 5,
        }} />
      );
    case 'diagonal':
      return (
        <>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
            background: isDark
              ? 'linear-gradient(155deg, transparent 20%, rgba(0,0,0,0.85) 100%)'
              : 'linear-gradient(155deg, transparent 20%, rgba(255,255,255,0.9) 100%)',
            zIndex: 5,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: '100%', height: isExport ? '5px' : '3px',
            background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)`,
            zIndex: 6,
          }} />
        </>
      );
    case 'gradient-bar':
      return (
        <>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 60%, transparent 100%)',
            zIndex: 5,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: isExport ? '6px' : '4px',
            background: `linear-gradient(90deg, ${brandColor}, #FF8A65, ${brandColor})`,
            zIndex: 15,
          }} />
        </>
      );
    case 'circle-accent':
      return (
        <>
          <div style={{
            position: 'absolute', top: '4%', right: '4%',
            width: '18%', aspectRatio: '1', borderRadius: '50%',
            background: `radial-gradient(circle, ${brandColor}50, ${brandColor}20)`,
            border: `2px solid ${brandColor}66`,
            boxShadow: `0 0 30px ${brandColor}30`,
            zIndex: 5,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, transparent 100%)',
            zIndex: 4,
          }} />
        </>
      );
    default:
      return null;
  }
}

// ─── Clickable Word Selector (visual cards like reference) ───────────────────

function WordSelector({
  headline, selectedWords, onToggleWord,
}: {
  headline: string;
  selectedWords: string[];
  onToggleWord: (word: string) => void;
}) {
  const words = headline.split(/\s+/).filter(w => w.length > 1);
  const uniqueWords = [...new Set(words.map(w => w.replace(/[^a-zA-ZÀ-ÿ0-9%$,]/g, '')))].filter(Boolean);

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] text-muted-foreground">Clique nas palavras para destacar (múltipla seleção):</p>
      <div className="flex flex-wrap gap-1">
        {uniqueWords.map((word, i) => {
          const isSelected = selectedWords.some(sw => 
            sw.toLowerCase() === word.toLowerCase()
          );
          return (
            <button
              key={`${word}-${i}`}
              onClick={() => onToggleWord(word)}
              className={cn(
                'text-[10px] px-2.5 py-1 rounded-md border-2 transition-all font-bold uppercase tracking-wide',
                isSelected
                  ? 'bg-primary/20 text-primary border-primary shadow-sm shadow-primary/30'
                  : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Highlight Style Picker (visual cards like reference screenshot) ─────────

function HighlightStylePicker({
  selected, onChange, highlightColor, onColorChange,
}: {
  selected: HighlightStyle;
  onChange: (s: HighlightStyle) => void;
  highlightColor: string;
  onColorChange: (c: string) => void;
}) {
  const styles: { id: HighlightStyle; label: string; icon: string; desc: string }[] = [
    { id: 'none', label: 'Nenhum', icon: '', desc: 'Sem destaque' },
    { id: 'color', label: 'Cor', icon: '✨', desc: 'Palavra em cor diferente' },
    { id: 'bold', label: 'Bold+', icon: 'B', desc: 'Bold com stroke e cor' },
    { id: 'box', label: 'Caixa', icon: '▮', desc: 'Fundo colorido no texto' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-muted-foreground uppercase">Estilo do destaque:</p>
      <div className="grid grid-cols-4 gap-1">
        {styles.map(s => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              'rounded-lg border-2 p-1.5 text-center transition-all',
              selected === s.id
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-border hover:border-primary/40'
            )}
          >
            <div className="text-sm font-black leading-none mb-0.5">
              {s.icon || '—'}
            </div>
            <p className="text-[8px] font-bold text-foreground">{s.label}</p>
            <p className="text-[7px] text-muted-foreground leading-tight">{s.desc}</p>
          </button>
        ))}
      </div>
      {selected !== 'none' && (
        <div className="flex items-center gap-2">
          <p className="text-[9px] font-bold text-muted-foreground">Cor:</p>
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1">
            <input
              type="color"
              value={highlightColor}
              onChange={e => onColorChange(e.target.value)}
              className="h-5 w-5 rounded cursor-pointer border-0 p-0"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{highlightColor}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CTA Button Renderer ────────────────────────────────────────────────────

function CTAButton({ 
  text, isExport = false, highlightColor, formatWidth, ctaScale = 1,
}: { 
  text: string; isExport?: boolean; highlightColor: string; formatWidth?: number; ctaScale?: number;
}) {
  if (!text) return null;
  // Base size 2.6% of width (increased from 1.6%), scaled by ctaScale
  const ctaSizePct = 2.6 * ctaScale;
  const fontSize = isExport && formatWidth
    ? `${(ctaSizePct / 100) * formatWidth}px`
    : `${ctaSizePct}cqw`;
  const padV = isExport && formatWidth ? `${Math.max(10, formatWidth * 0.009)}px` : '0.9cqw';
  const padH = isExport && formatWidth ? `${Math.max(18, formatWidth * 0.024)}px` : '2.4cqw';
  const radius = isExport && formatWidth ? `${Math.max(12, formatWidth * 0.012)}px` : '1.2cqw';
  const mt = isExport && formatWidth ? `${Math.max(12, formatWidth * 0.012)}px` : '1.2cqw';

  return (
    <div style={{
      marginTop: mt,
      display: 'inline-block',
      background: highlightColor,
      color: '#FFFFFF',
      fontWeight: 800,
      fontSize,
      padding: `${padV} ${padH}`,
      borderRadius: radius,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      boxShadow: `0 4px 16px ${highlightColor}55`,
    }}>
      {text}
    </div>
  );
}

function withAlpha(color: string, alphaHex: string) {
  return color.startsWith('#') && color.length === 7 ? `${color}${alphaHex}` : color;
}

function GraphicBackground({
  preset = 'editorial-grid',
  theme,
  highlightColor,
  format,
  isExport = false,
}: {
  preset?: GraphicPreset;
  theme: CarouselTheme;
  highlightColor: string;
  format: CreativeFormat;
  isExport?: boolean;
}) {
  const inset = isExport ? `${Math.round(format.width * 0.035)}px` : '3.5cqw';
  const thinLine = isExport ? `${Math.max(2, Math.round(format.width * 0.0035))}px` : '0.35cqw';
  const thickLine = isExport ? `${Math.max(6, Math.round(format.width * 0.012))}px` : '1.2cqw';
  const gridSize = isExport
    ? `${Math.round(format.width * 0.11)}px ${Math.round(format.width * 0.11)}px`
    : '11cqw 11cqw';
  const radius = isExport ? `${Math.round(format.width * 0.03)}px` : '3cqw';
  const neutralLine = theme.id === 'clean-white' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const glassPanel = theme.id === 'clean-white' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.42)';
  const accentSoft = withAlpha(highlightColor, '18');
  const accentMid = withAlpha(highlightColor, '35');
  const accentStrong = withAlpha(highlightColor, '70');

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: theme.bg }} />

      {preset === 'signal-frame' && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: `linear-gradient(140deg, transparent 0%, ${accentSoft} 100%)`,
          }} />
          <div style={{
            position: 'absolute', inset, zIndex: 2,
            border: `${thinLine} solid ${accentMid}`,
            borderRadius: radius,
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3,
            height: thickLine,
            background: `linear-gradient(90deg, ${highlightColor}, ${withAlpha(highlightColor, '00')} 82%)`,
          }} />
          <div style={{
            position: 'absolute', zIndex: 3,
            top: isExport ? `${Math.round(format.width * 0.05)}px` : '5cqw',
            left: isExport ? `${Math.round(format.width * 0.05)}px` : '5cqw',
            width: isExport ? `${Math.round(format.width * 0.18)}px` : '18cqw',
            height: thickLine,
            borderRadius: '999px',
            background: highlightColor,
          }} />
        </>
      )}

      {preset === 'editorial-grid' && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: `linear-gradient(${neutralLine} 1px, transparent 1px), linear-gradient(90deg, ${neutralLine} 1px, transparent 1px)`,
            backgroundSize: gridSize,
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: `linear-gradient(125deg, transparent 0%, transparent 52%, ${accentSoft} 52%, ${accentMid} 100%)`,
          }} />
          <div style={{
            position: 'absolute', zIndex: 3,
            right: isExport ? `${Math.round(format.width * 0.06)}px` : '6cqw',
            top: isExport ? `${Math.round(format.width * 0.06)}px` : '6cqw',
            width: isExport ? `${Math.round(format.width * 0.16)}px` : '16cqw',
            height: thickLine,
            background: highlightColor,
            borderRadius: '999px',
            transform: 'rotate(-35deg)',
            transformOrigin: 'center',
            opacity: 0.9,
          }} />
        </>
      )}

      {preset === 'spotlight-panel' && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: `radial-gradient(circle at 78% 18%, ${accentStrong} 0%, ${accentSoft} 20%, transparent 40%)`,
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: `linear-gradient(180deg, transparent 0%, ${accentSoft} 100%)`,
          }} />
          <div style={{
            position: 'absolute', zIndex: 3,
            left: inset,
            bottom: inset,
            width: '58%',
            height: '28%',
            borderRadius: radius,
            background: glassPanel,
            backdropFilter: 'blur(18px)',
            border: `${thinLine} solid ${accentMid}`,
          }} />
          <div style={{
            position: 'absolute', zIndex: 3,
            right: isExport ? `${Math.round(format.width * 0.06)}px` : '6cqw',
            top: isExport ? `${Math.round(format.width * 0.06)}px` : '6cqw',
            width: isExport ? `${Math.round(format.width * 0.14)}px` : '14cqw',
            aspectRatio: '1',
            borderRadius: '50%',
            border: `${thinLine} solid ${accentStrong}`,
          }} />
        </>
      )}
    </>
  );
}

function CreativeCanvas({
  variation,
  format,
  theme,
  exportMode = false,
}: {
  variation: CreativeVariation;
  format: CreativeFormat;
  theme: CarouselTheme;
  exportMode?: boolean;
}) {
  const textScale = variation.textScale ?? 1;
  const ctaScale = variation.ctaScale ?? 1;
  const imageOpacity = variation.imageOpacity ?? 0.5;
  const highlightStyle = variation.highlightStyle ?? 'none';
  const highlightWords = variation.highlightWords ?? variation.headlineHighlight ?? '';
  const fontFamily = variation.fontFamily ?? 'Montserrat';
  const textPosX = variation.textPositionX ?? 10;
  const textPosY = variation.textPositionY ?? 85;
  const highlightColor = variation.highlightColor || theme.highlightColor || '#E8603C';
  const graphicPreset = variation.graphicPreset ?? (variation.staticGraphicOnly ? 'signal-frame' : 'editorial-grid');
  const headlineSizePct = 3.9;
  const subSizePct = 1.7;
  const headlineFontSize = exportMode
    ? `${(headlineSizePct / 100) * format.width * textScale}px`
    : `${headlineSizePct * textScale}cqw`;
  const subFontSize = exportMode
    ? `${(subSizePct / 100) * format.width * textScale}px`
    : `${subSizePct * textScale}cqw`;
  const stackGap = exportMode ? `${Math.max(10, format.width * 0.009)}px` : '0.9cqw';
  const logoSize = exportMode ? `${Math.max(24, format.width * 0.024)}px` : '2.4cqw';
  const logoOffset = exportMode ? `${Math.max(16, format.width * 0.025)}px` : '2.5cqw';

  return (
    <div style={{
      width: exportMode ? format.width : '100%',
      height: exportMode ? format.height : undefined,
      aspectRatio: exportMode ? undefined : `${format.width}/${format.height}`,
      background: theme.bg,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: exportMode ? 0 : '8px',
      boxSizing: 'border-box',
      containerType: exportMode ? undefined : 'inline-size',
    }}>
      {variation.imageUrl ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${variation.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: imageOpacity,
            zIndex: 0,
          }} />
          <div style={{ position: 'absolute', inset: 0, background: theme.overlayGradient, zIndex: 1 }} />
        </>
      ) : (
        <>
          <GraphicBackground
            preset={graphicPreset}
            theme={theme}
            highlightColor={highlightColor}
            format={format}
            isExport={exportMode}
          />
          {!variation.staticGraphicOnly && variation.imagePrompt && (
            <div style={{
              position: 'absolute', inset: 0,
              background: theme.overlayGradient,
              opacity: theme.id === 'clean-white' ? 0.28 : 0.42,
              zIndex: 4,
            }} />
          )}
        </>
      )}

      <ShapeOverlay shape={variation.shape} theme={theme} isExport={exportMode} />

      <div style={{
        position: 'absolute',
        left: `${textPosX}%`,
        top: `${textPosY}%`,
        transform: 'translateY(-100%)',
        maxWidth: `${100 - textPosX - 6}%`,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: stackGap, width: '100%' }}>
          <div style={{
            fontFamily: `${fontFamily}, sans-serif`,
            fontWeight: 900,
            fontSize: headlineFontSize,
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            whiteSpace: 'pre-line',
          }}>
            {renderHighlightedText(variation.headline, highlightWords, highlightStyle, theme.headlineColor, highlightColor, exportMode)}
          </div>

          {variation.subtext && (
            <div style={{
              fontFamily: `${fontFamily}, sans-serif`,
              fontWeight: 600,
              fontSize: subFontSize,
              color: theme.subtextColor,
              lineHeight: 1.4,
            }}>
              {variation.subtext}
            </div>
          )}

          {variation.cta && (
            <CTAButton
              text={variation.cta}
              isExport={exportMode}
              highlightColor={highlightColor}
              formatWidth={exportMode ? format.width : undefined}
              ctaScale={ctaScale}
            />
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: logoOffset, right: logoOffset, zIndex: 10, opacity: 0.55 }}>
        <img src={dqfIcon} alt="DQF" style={{ width: logoSize, height: logoSize, filter: theme.iconFilter }} />
      </div>
    </div>
  );
}

async function waitForRenderableNode(node: HTMLElement) {
  await document.fonts.ready;
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }));
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 80));
}

// ─── Variation Card ──────────────────────────────────────────────────────────

function VariationCard({
  variation, format, theme, onRemove, onUpdate, onGenImage, isGenerating,
  isSelected, onToggleSelect,
}: {
  variation: CreativeVariation;
  format: CreativeFormat;
  theme: CarouselTheme;
  onRemove: () => void;
  onUpdate: (u: Partial<CreativeVariation>) => void;
  onGenImage: (prompt: string) => void;
  isGenerating: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { toast } = useToast();
  const exportRef = useRef<HTMLDivElement>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [editHeadline, setEditHeadline] = useState(variation.headline);
  const [editSubtext, setEditSubtext] = useState(variation.subtext || '');
  const [editCta, setEditCta] = useState(variation.cta || '');
  const [editCaption, setEditCaption] = useState(variation.caption);
  const [editImagePrompt, setEditImagePrompt] = useState(variation.imagePrompt || '');
  const [isMerging, setIsMerging] = useState(false);

  const textScale = variation.textScale ?? 1;
  const ctaScale = variation.ctaScale ?? 1;
  const imageOpacity = variation.imageOpacity ?? 0.5;
  const highlightStyle = variation.highlightStyle ?? 'none';
  const highlightWords = variation.highlightWords ?? variation.headlineHighlight ?? '';
  const fontFamily = variation.fontFamily ?? 'Montserrat';
  const textPosX = variation.textPositionX ?? 10;
  const textPosY = variation.textPositionY ?? 85;
  const highlightColor = variation.highlightColor || theme.highlightColor || '#E8603C';

  const selectedWordsList = highlightWords ? highlightWords.split('|').map(w => w.trim()).filter(Boolean) : [];

  const handleToggleWord = (word: string) => {
    const current = selectedWordsList;
    const exists = current.some(w => w.toLowerCase() === word.toLowerCase());
    const next = exists
      ? current.filter(w => w.toLowerCase() !== word.toLowerCase())
      : [...current, word];
    onUpdate({ highlightWords: next.join('|') });
  };

  // Smart Merge
  const handleSmartMerge = async () => {
    if (!variation.imageUrl) {
      toast({ title: 'Adicione uma imagem primeiro', variant: 'destructive' });
      return;
    }
    setIsMerging(true);
    try {
      const response = await supabase.functions.invoke('generate-slide-image', {
        body: {
          imagePrompt: `Create a professional marketing social media ad background. The image must be designed to accommodate text overlay. Text that will be placed: "${variation.headline}"${variation.subtext ? ` and "${variation.subtext}"` : ''}. Make the ${textPosY > 60 ? 'bottom' : 'top'} ${textPosX < 30 ? 'left' : textPosX > 70 ? 'right' : 'center'} area slightly darker/cleaner for text legibility. Style: ${variation.shape !== 'none' ? `with ${variation.shape} shape overlay` : 'clean composition'}. Keep the main subject visible but ensure text area has good contrast. Aspect ratio ${format.ratio}. Professional ad quality. IMPORTANT: Show diverse Brazilian workers in professional/neutral settings. Avoid stereotypical portrayals. NO favelas, NO poverty imagery. Show clean, professional work environments.`,
          quality: 'high',
        },
      });
      if (response.data?.imageUrl) {
        onUpdate({ imageUrl: response.data.imageUrl, imageOpacity: 0.85 });
        toast({ title: '✨ Mesclagem inteligente aplicada!' });
      }
    } catch {
      toast({ title: 'Erro na mesclagem', variant: 'destructive' });
    } finally {
      setIsMerging(false);
    }
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    exportRef.current.style.display = 'block';
    try {
      await waitForRenderableNode(exportRef.current);
      const url = await toPng(exportRef.current, { pixelRatio: 1, width: format.width, height: format.height, skipFonts: true, cacheBust: true });
      exportRef.current.style.display = 'none';
      const a = document.createElement('a');
      a.download = `DQEF-${variation.angle}-${Date.now()}.png`;
      a.href = url;
      a.click();
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
      if (exportRef.current) exportRef.current.style.display = 'none';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(variation.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 1500);
  };

  const handleSaveEdit = () => {
    onUpdate({ headline: editHeadline, subtext: editSubtext, cta: editCta, caption: editCaption });
    setIsEditing(false);
    toast({ title: 'Variação atualizada!' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const renderPreview = () => <CreativeCanvas variation={variation} format={format} theme={theme} />;

  const renderExport = () => <CreativeCanvas variation={variation} format={format} theme={theme} exportMode />;

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden group relative transition-all",
      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
    )}>
      {/* Selection checkbox */}
      <div
        className="absolute top-2 left-2 z-30 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
      >
        <div className={cn(
          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
          isSelected
            ? "bg-primary border-primary"
            : "bg-black/40 border-white/50 opacity-0 group-hover:opacity-100"
        )}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      </div>

      {/* Preview */}
      <div className="relative">
        {renderPreview()}
        <div className="absolute top-2 left-8 flex gap-1 z-20">
          <Badge className="bg-black/60 text-white border-none text-[8px]">{variation.angle}</Badge>
        </div>
        <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" className="h-6 w-6 bg-black/60 hover:bg-black/80 border-none" onClick={() => { setIsEditing(!isEditing); setShowControls(false); }}>
            <Type className="h-3 w-3 text-white" />
          </Button>
          <Button size="icon" variant="secondary" className="h-6 w-6 bg-black/60 hover:bg-black/80 border-none" onClick={() => { setShowControls(!showControls); setIsEditing(false); }}>
            <SlidersHorizontal className="h-3 w-3 text-white" />
          </Button>
        </div>
      </div>

      {/* Shape + Highlight — always visible for quick editing */}
      <div className="px-2 pt-2 space-y-1.5">
        {/* Shape row */}
        <div className="flex gap-1 flex-wrap">
          {SHAPE_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdate({ shape: s.id })}
              className={cn(
                'text-[8px] px-1.5 py-0.5 rounded-full border transition-all',
                variation.shape === s.id
                  ? 'bg-primary/20 border-primary text-primary font-bold'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:border-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* Highlight word selector — click words to highlight */}
        <div className="flex gap-0.5 flex-wrap">
          {variation.headline.split(/\s+/).filter(Boolean).map((word, i) => {
            const isSelected = selectedWordsList.some(w => w.toLowerCase() === word.toLowerCase());
            return (
              <button
                key={`${word}-${i}`}
                onClick={() => handleToggleWord(word)}
                className={cn(
                  'text-[8px] px-1 py-0.5 rounded transition-all border',
                  isSelected
                    ? 'bg-primary/30 border-primary text-primary font-bold'
                    : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'
                )}
              >
                {word}
              </button>
            );
          })}
        </div>
        {/* Highlight style row */}
        <div className="flex gap-1 items-center">
          {HIGHLIGHT_STYLES.map(hs => (
            <button
              key={hs.id}
              onClick={() => onUpdate({ highlightStyle: hs.id })}
              className={cn(
                'text-[7px] px-1.5 py-0.5 rounded border transition-all',
                highlightStyle === hs.id
                  ? 'bg-primary/20 border-primary text-primary font-bold'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:border-border'
              )}
            >
              {hs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Editor Panel */}
      {isEditing && (
        <div className="p-2 space-y-2 border-t border-border bg-muted/30">
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Headline</label>
            <Textarea
              value={editHeadline}
              onChange={e => setEditHeadline(e.target.value)}
              className="min-h-[40px] text-xs mt-0.5 resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Subtexto</label>
            <Textarea
              value={editSubtext}
              onChange={e => setEditSubtext(e.target.value)}
              className="min-h-[30px] text-xs mt-0.5 resize-none"
              rows={1}
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">CTA (Botão)</label>
            <Textarea
              value={editCta}
              onChange={e => setEditCta(e.target.value)}
              className="min-h-[24px] text-xs mt-0.5 resize-none"
              rows={1}
              placeholder="Ex: CADASTRE-SE GRÁTIS"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Caption</label>
            <Textarea
              value={editCaption}
              onChange={e => setEditCaption(e.target.value)}
              className="min-h-[50px] text-xs mt-0.5 resize-none"
              rows={3}
            />
          </div>
          {/* Highlight — interactive word selector + style cards */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              ✨ Destaque de Palavras
            </label>
            <WordSelector
              headline={variation.headline}
              selectedWords={selectedWordsList}
              onToggleWord={handleToggleWord}
            />
            <HighlightStylePicker
              selected={highlightStyle}
              onChange={s => onUpdate({ highlightStyle: s })}
              highlightColor={highlightColor}
              onColorChange={c => onUpdate({ highlightColor: c })}
            />
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[9px] flex-1" onClick={handleSaveEdit}>Salvar</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => setIsEditing(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Controls Panel — sliders + image prompt */}
      {showControls && (
        <div className="p-2 space-y-2 border-t border-border bg-muted/30">
          <AdjSlider label="Escala Texto" value={textScale} min={0.5} max={2} step={0.05} onValueChange={v => onUpdate({ textScale: v })} />
          <AdjSlider label="Escala CTA" value={ctaScale} min={0.6} max={2} step={0.1} onValueChange={v => onUpdate({ ctaScale: v })} />
          <AdjSlider label="Posição X" value={textPosX} min={2} max={80} step={1} display={`${textPosX}%`} onValueChange={v => onUpdate({ textPositionX: v })} />
          <AdjSlider label="Posição Y" value={textPosY} min={15} max={98} step={1} display={`${textPosY}%`} onValueChange={v => onUpdate({ textPositionY: v })} />
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">CTA Rápido</label>
            <input
              type="text"
              value={variation.cta || ''}
              onChange={e => onUpdate({ cta: e.target.value.toUpperCase() })}
              className="mt-1 h-7 w-full rounded-md border border-border bg-background px-2 text-[10px] text-foreground"
              placeholder="Ex: QUERO ME CADASTRAR"
            />
          </div>
          {variation.imageUrl && (
            <AdjSlider label="Opacidade" value={imageOpacity} min={0} max={1} step={0.05} onValueChange={v => onUpdate({ imageOpacity: v })} />
          )}

          {/* Font picker */}
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Fonte</label>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {FONT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => onUpdate({ fontFamily: f.id })}
                  className={cn('text-[7px] px-1.5 py-0.5 rounded border transition-all',
                    fontFamily === f.id ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-border text-muted-foreground')}>
                  <span style={{ fontFamily: `${f.id}, sans-serif` }}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Per-variation style picker */}
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Estilo</label>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {VISUAL_STYLES.map(s => (
                <button key={s.id} onClick={() => {
                  onUpdate({
                    shape: s.shape,
                    fontFamily: s.fontFamily,
                    highlightStyle: s.highlightStyle,
                  });
                }}
                  className="text-[7px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:border-primary/40 transition-all">
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image prompt editable */}
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Prompt de Imagem</label>
            <Textarea
              value={editImagePrompt}
              onChange={e => setEditImagePrompt(e.target.value)}
              className="min-h-[40px] text-[10px] mt-0.5 resize-none"
              rows={2}
              placeholder="Descreva a imagem desejada..."
            />
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="outline" className="h-5 text-[8px] flex-1 gap-1" onClick={() => onGenImage(editImagePrompt || variation.headline)} disabled={isGenerating}>
                {isGenerating ? <RefreshCw className="h-2 w-2 animate-spin" /> : <Wand2 className="h-2 w-2" />}
                Gerar IA
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button size="sm" variant="outline" className="h-5 text-[8px] gap-1 pointer-events-none">
                  <Upload className="h-2 w-2" /> Upload
                </Button>
              </label>
              {variation.imageUrl && (
                <Button size="sm" variant="ghost" className="h-5 text-[8px] text-destructive" onClick={() => onUpdate({ imageUrl: undefined })}>
                  ✕
                </Button>
              )}
            </div>
          </div>

          {/* Smart Merge Button */}
          {variation.imageUrl && (
            <Button
              size="sm"
              className="w-full h-7 text-[9px] gap-1.5 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 font-bold"
              onClick={handleSmartMerge}
              disabled={isMerging}
            >
              {isMerging
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Mesclando...</>
                : <><Sparkles className="h-3 w-3" /> Mesclagem Inteligente</>}
            </Button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-2 space-y-1.5">
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1 gap-1" onClick={handleExport}>
            <Download className="h-2.5 w-2.5" /> PNG
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1 gap-1" onClick={handleCopy}>
            {copiedCaption ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
            Copy
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[9px] text-destructive" onClick={onRemove}>
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground line-clamp-2">{variation.caption.slice(0, 100)}...</p>

        {variation.viralLogic && (
          <p className="text-[8px] text-emerald-400 italic">💡 {variation.viralLogic}</p>
        )}
      </div>

      {/* Hidden export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={exportRef} style={{ display: 'none' }}>
          {renderExport()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Grid ───────────────────────────────────────────────────────────────

export default function VariationsGrid({
  variations, onRemove, onUpdateVariation, onGenerateImage, onGenerateAllImages,
  onSearchLibrary, isSearchingLibrary, librarySearchProgress,
  isGeneratingAllImages, imageGenProgress, onExportAll,
  format, theme, isGeneratingImage,
}: Props) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === variations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(variations.map(v => v.id)));
    }
  };

  const removeSelected = () => {
    selectedIds.forEach(id => onRemove(id));
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} variações removidas` });
  };

  const applyStyleToAll = (styleId: string) => {
    const style = VISUAL_STYLES.find(s => s.id === styleId);
    if (!style) return;
    // Find matching theme for this style
    const themeMap: Record<string, string> = {
      'impacto': 'dark-luxe', 'documental': 'dark-luxe', 'social-proof': 'clean-white',
      'provocacao': 'dqef-brand', 'minimalista': 'clean-white',
    };
    variations.forEach(v => {
      onUpdateVariation(v.id, {
        shape: style.shape,
        fontFamily: style.fontFamily,
        highlightStyle: style.highlightStyle,
        imageOpacity: style.defaultOpacity,
      });
    });
    toast({ title: `Estilo "${style.label}" aplicado a ${variations.length} variações` });
  };

  const applyTextScaleToAll = (scale: number) => {
    variations.forEach(v => {
      onUpdateVariation(v.id, { textScale: scale });
    });
  };

  const applyCtaScaleToAll = (scale: number) => {
    variations.forEach(v => {
      onUpdateVariation(v.id, { ctaScale: scale });
    });
  };

  const applyTextPositionXToAll = (positionX: number) => {
    variations.forEach(v => {
      onUpdateVariation(v.id, { textPositionX: positionX });
    });
  };

  const applyTextPositionYToAll = (positionY: number) => {
    variations.forEach(v => {
      onUpdateVariation(v.id, { textPositionY: positionY });
    });
  };

  const applyCtaTextToAll = (ctaText: string) => {
    variations.forEach(v => {
      onUpdateVariation(v.id, { cta: ctaText });
    });
    toast({ title: `CTA "${ctaText}" aplicado a todas` });
  };

  const applyHighlightStyleToAll = (hs: HighlightStyle) => {
    variations.forEach(v => {
      onUpdateVariation(v.id, { highlightStyle: hs });
    });
    toast({ title: `Destaque "${hs}" aplicado a todas` });
  };

  const exportSelectedAsZip = async () => {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: selectedIds.size });

    const zip = new JSZip();
    const selectedVariations = variations.filter(v => selectedIds.has(v.id));
    const legendas: string[] = [];
    let done = 0;

    const renderVariationForZip = async (variation: CreativeVariation) => {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.width = `${format.width}px`;
      container.style.height = `${format.height}px`;
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      const root = createRoot(container);

      try {
        root.render(<CreativeCanvas variation={variation} format={format} theme={theme} exportMode />);
        await waitForRenderableNode(container);
        const node = container.firstElementChild as HTMLElement | null;
        if (!node) throw new Error('Export node not available');
        return await toPng(node, {
          pixelRatio: 1,
          width: format.width,
          height: format.height,
          skipFonts: true,
          cacheBust: true,
        });
      } finally {
        root.unmount();
        document.body.removeChild(container);
      }
    };

    for (const [index, v] of selectedVariations.entries()) {
      const fileName = `DQEF-${v.angle}-${index + 1}.png`;
      try {
        const dataUrl = await renderVariationForZip(v);
        zip.file(fileName, dataUrl.split(',')[1], { base64: true });
        legendas.push(`--- ${fileName} ---\n${v.caption}\n`);
      } catch (err) {
        console.error('Export error for variation', v.id, err);
      }

      done += 1;
      setExportProgress({ current: done, total: selectedIds.size });
    }

    if (legendas.length > 0) {
      zip.file('legendas.txt', legendas.join('\n'));
    }

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DQEF-criativos-${selectedIds.size}x-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `📦 ${selectedIds.size} criativos exportados!`, description: 'ZIP com PNGs + legendas.txt' });
    } catch {
      toast({ title: 'Erro ao gerar ZIP', variant: 'destructive' });
    }

    setIsExporting(false);
    setExportProgress(null);
  };

  if (variations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center min-h-[200px]">
        <Layers className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-xs font-bold text-muted-foreground">Nenhuma variação gerada</p>
        <p className="text-[10px] text-muted-foreground mt-1">Gere variações para testar diferentes abordagens</p>
      </div>
    );
  }

  const isCompact = variations.length > 6;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">{variations.length} Variações</span>
          {selectedIds.size > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">
              {selectedIds.size} selecionadas
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={selectAll}>
            {selectedIds.size === variations.length
              ? <><CheckSquare className="h-3 w-3" /> Desmarcar</>
              : <><Square className="h-3 w-3" /> Selecionar Todos</>}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5" onClick={onExportAll}>
            <Download className="h-3 w-3" /> Exportar
          </Button>
        </div>
      </div>

      {/* ─── Bulk Controls Bar ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Controles em Massa</p>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Estilo em Massa */}
          <div className="flex items-center gap-1.5">
            <Palette className="h-3 w-3 text-muted-foreground" />
            <Select onValueChange={applyStyleToAll}>
              <SelectTrigger className="h-7 text-[10px] w-[150px] border-border">
                <SelectValue placeholder="Estilo Visual" />
              </SelectTrigger>
              <SelectContent>
                {VISUAL_STYLES.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text Scale em Massa */}
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <Type className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[9px] text-muted-foreground shrink-0">Texto:</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              defaultValue={1}
              onChange={e => applyTextScaleToAll(parseFloat(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          {/* CTA Scale em Massa */}
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <span className="text-[9px] text-muted-foreground shrink-0">CTA:</span>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              defaultValue={1}
              onChange={e => applyCtaScaleToAll(parseFloat(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-[130px]">
            <span className="text-[9px] text-muted-foreground shrink-0">Texto X:</span>
            <input
              type="range"
              min={2}
              max={80}
              step={1}
              defaultValue={10}
              onChange={e => applyTextPositionXToAll(parseFloat(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-[130px]">
            <span className="text-[9px] text-muted-foreground shrink-0">Texto Y:</span>
            <input
              type="range"
              min={15}
              max={98}
              step={1}
              defaultValue={85}
              onChange={e => applyTextPositionYToAll(parseFloat(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          {/* CTA Text em Massa */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="CTA em massa"
              className="h-7 text-[10px] w-[130px] rounded-md border border-border bg-background px-2"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) applyCtaTextToAll(val.toUpperCase());
                }
              }}
            />
          </div>

          {/* Highlight Style em Massa */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">Destaque:</span>
            {HIGHLIGHT_STYLES.map(hs => (
              <button
                key={hs.id}
                onClick={() => applyHighlightStyleToAll(hs.id)}
                className={cn(
                  'text-[8px] px-1.5 py-0.5 rounded border transition-all',
                  'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                {hs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image generation buttons */}
        <div className="flex items-center gap-1.5">
          {onGenerateAllImages && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-bold"
              onClick={onGenerateAllImages}
              disabled={isGeneratingAllImages || variations.every(v => !!v.imageUrl)}
            >
              {isGeneratingAllImages
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Gerando {imageGenProgress ? `${imageGenProgress.current}/${imageGenProgress.total}` : '...'}</>
                : <><ImageIcon className="h-3 w-3" /> 🎨 Gerar Todas Imagens IA</>}
            </Button>
          )}
          {onSearchLibrary && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] gap-1.5 font-bold"
              onClick={onSearchLibrary}
              disabled={isSearchingLibrary || variations.every(v => !!v.imageUrl)}
            >
              {isSearchingLibrary
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Buscando {librarySearchProgress ? `${librarySearchProgress.current}/${librarySearchProgress.total} (${librarySearchProgress.matches} matches)` : '...'}</>
                : <><Library className="h-3 w-3" /> 📚 Buscar da Biblioteca</>}
            </Button>
          )}
        </div>
      </div>

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">{selectedIds.size} criativos selecionados</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1.5 font-bold"
              onClick={exportSelectedAsZip}
              disabled={isExporting}
            >
              {isExporting
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Exportando...</>
                : <><Download className="h-3 w-3" /> Exportar {selectedIds.size} como ZIP</>}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive gap-1" onClick={removeSelected}>
              <Trash2 className="h-3 w-3" /> Remover
            </Button>
          </div>
        </div>
      )}

      {/* Export progress */}
      {exportProgress && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Exportando PNGs + legendas...</span>
            <span className="text-xs font-mono text-primary">{exportProgress.current}/{exportProgress.total}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid */}
      <div className={cn(
        "grid gap-3",
        isCompact ? "grid-cols-3 xl:grid-cols-5" : "grid-cols-2 xl:grid-cols-3"
      )}>
        {variations.map(v => (
          <VariationCard
            key={v.id}
            variation={v}
            format={format}
            theme={theme}
            onRemove={() => onRemove(v.id)}
            onUpdate={u => onUpdateVariation(v.id, u)}
            onGenImage={(prompt) => onGenerateImage(v.id, prompt)}
            isGenerating={isGeneratingImage === v.id}
            isSelected={selectedIds.has(v.id)}
            onToggleSelect={() => toggleSelect(v.id)}
          />
        ))}
      </div>
    </div>
  );
}
