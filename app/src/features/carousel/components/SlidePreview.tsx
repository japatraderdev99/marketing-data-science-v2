import { forwardRef } from 'react';
import type { SlideOutput, CarouselTheme, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { TYPE_LABELS } from '../constants';
import { ShapeOverlay } from './ShapeOverlay';
import { renderHighlightedText } from './WordHighlight';

interface SlidePreviewProps {
  slide: SlideOutput;
  theme: CarouselTheme;
  width?: number;
  height?: number;
  imageUrl?: string | null;
  showWatermark?: boolean;
  settings?: SlideSettings;
  isExport?: boolean;
}

export const SlidePreview = forwardRef<HTMLDivElement, SlidePreviewProps>(
  ({ slide, theme, width = 340, height = 425, imageUrl, showWatermark = true, settings, isExport = false }, ref) => {
    const s = settings || DEFAULT_SLIDE_SETTINGS;
    const scale = width / 1080;
    const typeLabel = TYPE_LABELS[slide.type] || slide.type.toUpperCase();

    const baseFontSize = slide.layout === 'number-dominant' ? 72 : 38;
    const headlineSize = baseFontSize * scale * s.textScale;
    const subtextSize = 14 * scale * s.textScale;
    const ctaSize = 11 * scale * s.ctaScale;

    // Use highlight system if settings have highlight words, otherwise fallback to old headlineHighlight
    const hasCustomHighlight = s.highlightWords && s.highlightStyle !== 'none';

    const renderHeadline = () => {
      if (hasCustomHighlight) {
        return renderHighlightedText(
          slide.headline,
          s.highlightWords,
          s.highlightStyle,
          theme.headlineColor,
          s.highlightColor,
          isExport,
        );
      }
      // Fallback: old single-word highlight
      if (slide.headlineHighlight) {
        const text = slide.headline;
        const highlight = slide.headlineHighlight;
        const idx = text.toUpperCase().indexOf(highlight.toUpperCase());
        if (idx === -1) return text;
        const before = text.slice(0, idx);
        const word = text.slice(idx, idx + highlight.length);
        const after = text.slice(idx + highlight.length);
        return (
          <>
            {before}
            <span style={{
              backgroundColor: theme.highlightBgOnImage,
              padding: '0 0.15em',
              borderRadius: '4px',
            }}>
              {word}
            </span>
            {after}
          </>
        );
      }
      return slide.headline;
    };

    return (
      <div
        ref={ref}
        className="slide-export relative overflow-hidden select-none"
        style={{
          width,
          height,
          borderRadius: isExport ? 0 : 12,
          background: theme.bg.startsWith('linear') ? theme.bg : theme.bg,
          backgroundColor: theme.bg.startsWith('linear') ? undefined : theme.bg,
          backgroundImage: theme.bg.startsWith('linear') ? theme.bg : undefined,
          fontFamily: s.fontFamily || 'Montserrat',
        }}
      >
        {/* Background image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: s.imageOpacity,
              transform: `scale(${s.imageZoom}) translateY(${s.imageOffsetY}px)`,
              transformOrigin: 'center center',
            }}
          />
        )}

        {/* Overlay gradient (always, on top of image) */}
        <div
          className="absolute inset-0"
          style={{ background: theme.overlayGradient, zIndex: 2 }}
        />

        {/* Shape overlay */}
        {s.shape !== 'none' && (
          <ShapeOverlay shape={s.shape} theme={theme} isExport={isExport} />
        )}

        {/* Slide type badge */}
        <div
          className="absolute top-0 left-0 font-bold tracking-widest uppercase"
          style={{
            fontSize: 9 * scale,
            padding: `${4 * scale}px ${10 * scale}px`,
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: 'rgba(255,255,255,0.6)',
            borderBottomRightRadius: 6,
            zIndex: 10,
          }}
        >
          {typeLabel}
        </div>

        {/* Content — positioned by textPositionX/Y */}
        <div
          className="absolute flex flex-col"
          style={{
            left: `${s.textPositionX}%`,
            top: `${s.textPositionY}%`,
            right: `${Math.max(4, s.textPositionX)}%`,
            transform: 'translateY(-100%)',
            zIndex: 10,
          }}
        >
          {/* Headline */}
          <h2
            className="font-black uppercase leading-[1.05] tracking-tight"
            style={{
              fontSize: headlineSize,
              color: theme.headlineColor,
              lineHeight: 1.05,
              marginBottom: 8 * scale,
              fontFamily: s.fontFamily || 'Montserrat',
            }}
          >
            {renderHeadline()}
          </h2>

          {/* Subtext */}
          {slide.subtext && (
            <p
              style={{
                fontSize: subtextSize,
                color: theme.subtextColor,
                lineHeight: 1.4,
                maxWidth: '90%',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {slide.subtext}
            </p>
          )}

          {/* CTA slogan */}
          {slide.type === 'cta' && (
            <p
              className="font-bold tracking-wide"
              style={{
                fontSize: ctaSize,
                color: theme.sloganBright,
                marginTop: 12 * scale,
                fontFamily: s.fontFamily || 'Montserrat',
              }}
            >
              pronto. resolvido.
            </p>
          )}
        </div>

        {/* Watermark */}
        {showWatermark && (
          <span
            className="absolute font-bold uppercase"
            style={{
              bottom: 8 * scale,
              right: 10 * scale,
              fontSize: 8 * scale,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.15em',
              zIndex: 10,
              fontFamily: 'Montserrat',
            }}
          >
            DQEF
          </span>
        )}
      </div>
    );
  },
);

SlidePreview.displayName = 'SlidePreview';
