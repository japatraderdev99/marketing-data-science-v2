import { forwardRef } from 'react';
import type { SlideOutput, CarouselTheme, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { TYPE_LABELS } from '../constants';
import { ShapeOverlay } from './ShapeOverlay';
import dqefLogoWhite from '@/assets/dqef-logo-white.png';
import dqefIconOrange from '@/assets/dqef-icon-orange.png';
import { renderHighlightedText } from './WordHighlight';

// ── SlidePreview ─────────────────────────────────────────────────────────────
// WYSIWYG: inner design canvas is always 1080×1350px.
// A CSS scale() transform fits it into the preview container.
// Export: render this component with width=1080 → scale=1 → pixel-perfect PNG.

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
    const previewScale = width / 1080;
    const typeLabel = TYPE_LABELS[slide.type] || slide.type.toUpperCase();

    // Design-size font values (at 1080px canvas — no * scale needed)
    const baseFontSize = slide.layout === 'number-dominant' ? 144 : 72;
    const headlineSize = baseFontSize * s.textScale;
    const subtextSize = 30 * s.textScale;
    const ctaSize = 24 * s.ctaScale;

    const hasCustomHighlight = s.highlightWords && s.highlightStyle !== 'none';

    const renderHeadline = () => {
      if (hasCustomHighlight) {
        return renderHighlightedText(slide.headline, s.highlightWords, s.highlightStyle, theme.headlineColor, s.highlightColor, true);
      }
      if (slide.headlineHighlight) {
        const t = slide.headline;
        const h = slide.headlineHighlight;
        const idx = t.toUpperCase().indexOf(h.toUpperCase());
        if (idx === -1) return t;
        return (
          <>
            {t.slice(0, idx)}
            <span style={{ backgroundColor: theme.highlightBgOnImage, padding: '0 0.15em', borderRadius: '4px' }}>
              {t.slice(idx, idx + h.length)}
            </span>
            {t.slice(idx + h.length)}
          </>
        );
      }
      return slide.headline;
    };

    return (
      // Outer clip container — defines the visible area
      <div ref={ref} style={{
        width, height, overflow: 'hidden', position: 'relative', flexShrink: 0,
        borderRadius: isExport ? 0 : 12,
      }}>
        {/* Inner design canvas at full 1080×1350 — CSS-scaled to fit */}
        <div
          className="slide-export"
          style={{
            width: 1080, height: 1350,
            transform: `scale(${previewScale})`, transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0,
            background: theme.bg.startsWith('linear') ? theme.bg : undefined,
            backgroundColor: theme.bg.startsWith('linear') ? undefined : theme.bg,
            backgroundImage: theme.bg.startsWith('linear') ? theme.bg : undefined,
            fontFamily: s.fontFamily || 'Montserrat',
          }}
        >
          {/* Background image */}
          {imageUrl && (
            <img src={imageUrl} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0,
              opacity: s.imageOpacity,
              transform: `scale(${s.imageZoom}) translateY(${s.imageOffsetY}px)`,
              transformOrigin: 'center center',
            }} />
          )}

          {/* Overlay gradient */}
          <div style={{ position: 'absolute', inset: 0, background: theme.overlayGradient, zIndex: 2 }} />

          {/* Shape overlay */}
          {s.shape !== 'none' && <ShapeOverlay shape={s.shape} theme={theme} isExport />}

          {/* Slide type badge */}
          <div style={{
            position: 'absolute', top: 0, left: 0, zIndex: 10,
            fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '8px 18px',
            backgroundColor: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.6)',
            borderBottomRightRadius: 8,
          }}>
            {typeLabel}
          </div>

          {/* Content — positioned by textPositionX/Y percentages */}
          <div style={{
            position: 'absolute',
            left: `${s.textPositionX}%`,
            top: `${s.textPositionY}%`,
            right: `${Math.max(4, s.textPositionX)}%`,
            transform: 'translateY(-100%)',
            display: 'flex', flexDirection: 'column',
            zIndex: 10,
          }}>
            <h2 style={{
              fontFamily: s.fontFamily || 'Montserrat', fontWeight: 900,
              textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.02em',
              fontSize: headlineSize, color: theme.headlineColor,
              margin: '0 0 24px',
            }}>
              {renderHeadline()}
            </h2>

            {slide.subtext && (
              <p style={{
                fontSize: subtextSize, color: theme.subtextColor,
                lineHeight: 1.4, maxWidth: '90%', margin: 0,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {slide.subtext}
              </p>
            )}

            {slide.type === 'cta' && (
              <p style={{
                fontFamily: s.fontFamily || 'Montserrat', fontWeight: 700, letterSpacing: '0.05em',
                fontSize: ctaSize, color: theme.sloganBright, margin: '32px 0 0',
              }}>
                pronto. resolvido.
              </p>
            )}
          </div>

          {/* Brand mark — orange icon on light bg, white logo on dark/orange bg */}
          {showWatermark && (
            <img
              src={theme.headlineColor === '#1A1A1A' ? dqefIconOrange : dqefLogoWhite}
              alt="DQEF"
              style={{
                position: 'absolute', bottom: 32, right: 36, zIndex: 10,
                width: 56, height: 56, objectFit: 'contain', opacity: 0.65,
              }}
            />
          )}
        </div>
      </div>
    );
  }
);

SlidePreview.displayName = 'SlidePreview';
