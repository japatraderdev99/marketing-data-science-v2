import { forwardRef } from 'react';
import type { NarrativeSlide, NarrativeThemeId } from '@/types';
import { TYPE_LABELS } from '../constants';

const THEME_STYLES: Record<NarrativeThemeId, { bg: string; text: string; accent: string; overlay: string }> = {
  'editorial-dark': { bg: '#0F0F0F', text: '#FFFFFF', accent: '#E8603C', overlay: 'rgba(0,0,0,0.7)' },
  'editorial-cream': { bg: '#F5F0E8', text: '#1A1A1A', accent: '#E8603C', overlay: 'rgba(245,240,232,0.8)' },
  'brand-bold': { bg: '#E8603C', text: '#FFFFFF', accent: '#FFFFFF', overlay: 'rgba(232,96,60,0.7)' },
};

interface Props {
  slide: NarrativeSlide;
  theme: NarrativeThemeId;
  width?: number;
  height?: number;
  imageUrl?: string | null;
}

export const NarrativeSlidePreview = forwardRef<HTMLDivElement, Props>(
  ({ slide, theme, width = 340, height = 425, imageUrl }, ref) => {
    const scale = width / 1080;
    const styles = THEME_STYLES[theme];
    const typeLabel = TYPE_LABELS[slide.type] || slide.type.toUpperCase();
    const bgColor = slide.bgColor || styles.bg;
    const textColor = slide.textColor || styles.text;
    const accent = slide.accentColor || styles.accent;

    const renderBody = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: accent, fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      });
    };

    const isFullImage = slide.layout === 'full-image' || slide.layout === 'cta';

    return (
      <div
        ref={ref}
        className="slide-export relative overflow-hidden select-none"
        style={{ width, height, borderRadius: 12, backgroundColor: bgColor }}
      >
        {imageUrl && isFullImage && (
          <>
            <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{
              background: `linear-gradient(to top, ${styles.overlay} 0%, transparent 60%)`,
            }} />
          </>
        )}

        {imageUrl && slide.layout === 'split' && (
          <div
            className="absolute top-0 h-full w-1/2"
            style={{ [slide.imageSide === 'left' ? 'left' : 'right']: 0 }}
          >
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Type badge */}
        <div
          className="absolute top-0 left-0 uppercase tracking-widest font-bold"
          style={{
            fontSize: 9 * scale,
            padding: `${4 * scale}px ${10 * scale}px`,
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: 'rgba(255,255,255,0.6)',
            borderBottomRightRadius: 6,
          }}
        >
          {typeLabel}
        </div>

        {/* Content */}
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{
            padding: 28 * scale,
            ...(slide.layout === 'split' && slide.imageSide === 'left' ? { paddingLeft: `${55}%` } : {}),
            ...(slide.layout === 'split' && slide.imageSide === 'right' ? { paddingRight: `${55}%` } : {}),
          }}
        >
          <h2
            className="font-heading font-black uppercase leading-[1.05] tracking-tight"
            style={{
              fontSize: (slide.layout === 'quote' ? 32 : 36) * scale,
              color: textColor,
              marginBottom: 10 * scale,
            }}
          >
            {slide.headline}
          </h2>

          {slide.bodyText && (
            <p
              className="font-sans leading-relaxed"
              style={{
                fontSize: 13 * scale,
                color: `${textColor}cc`,
                lineHeight: 1.5,
              }}
            >
              {renderBody(slide.bodyText)}
            </p>
          )}

          {slide.sourceLabel && (
            <span
              className="mt-2 inline-block font-sans italic"
              style={{
                fontSize: 9 * scale,
                color: `${textColor}80`,
                marginTop: 6 * scale,
              }}
            >
              Fonte: {slide.sourceLabel}
            </span>
          )}

          {slide.type === 'cta' && (
            <p
              className="font-heading font-bold tracking-wide"
              style={{ fontSize: 12 * scale, color: accent, marginTop: 14 * scale }}
            >
              pronto. resolvido.
            </p>
          )}
        </div>

        {/* Slide number */}
        <span
          className="absolute font-heading font-bold"
          style={{
            bottom: 8 * scale,
            right: 10 * scale,
            fontSize: 9 * scale,
            color: `${textColor}30`,
          }}
        >
          {slide.number}
        </span>
      </div>
    );
  },
);

NarrativeSlidePreview.displayName = 'NarrativeSlidePreview';
