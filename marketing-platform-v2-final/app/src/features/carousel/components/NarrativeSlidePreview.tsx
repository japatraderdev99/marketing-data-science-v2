import { forwardRef } from 'react';
import type { NarrativeSlide, NarrativeThemeId, HighlightStyle } from '@/types';
import { TYPE_LABELS } from '../constants';
import { NARRATIVE_PALETTE, Accent, Body, DqMark, HeadlineRenderer } from './NarrativeSlideHelpers';

// ── Settings ──────────────────────────────────────────────────────────────────

export interface NarrativeSlideSettings {
  headlineScale?: number;
  bodyScale?: number;
  imageOpacity?: number;
  imageZoom?: number;
  imageOffsetY?: number;
  highlightWords?: string;
  highlightStyle?: HighlightStyle;
  highlightColor?: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  slide: NarrativeSlide;
  theme: NarrativeThemeId;
  width?: number;
  height?: number;
  imageUrl?: string | null;
  settings?: NarrativeSlideSettings;
  totalSlides?: number;
  isExport?: boolean;
}

export const NarrativeSlidePreview = forwardRef<HTMLDivElement, Props>(
  ({ slide, theme, width = 340, height = 425, imageUrl, settings, totalSlides, isExport = false }, ref) => {
    const scale = width / 1080;
    const pal = NARRATIVE_PALETTE[theme] ?? NARRATIVE_PALETTE['editorial-dark'];
    const accent = slide.accentColor || pal.accent;
    const hs = settings?.headlineScale ?? 1.0;
    const bs = settings?.bodyScale ?? 1.0;
    const imgOpacity = settings?.imageOpacity ?? 1.0;
    const imgZoom = settings?.imageZoom ?? 1.0;
    const imgOffsetY = settings?.imageOffsetY ?? 0;
    const hlWords = settings?.highlightWords;
    const hlStyle = settings?.highlightStyle ?? 'none';
    const hlColor = settings?.highlightColor ?? '#E8603C';
    const isEditorial = theme === 'dqef-editorial';

    // DQEF editorial: auto-cycle bg per slide number
    let bg = slide.bgColor || pal.bg;
    let textColor = slide.textColor || pal.text;
    if (isEditorial && !slide.bgColor) {
      if      (slide.number % 3 === 0) { bg = '#E8603C'; textColor = '#FFFFFF'; }
      else if (slide.number % 2 === 0) { bg = '#111111'; textColor = '#FFFFFF'; }
      else                             { bg = '#F7F2EB'; textColor = '#111111'; }
    }

    const isDark = textColor === '#FFFFFF';
    const bodyColor  = isDark ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.62)';
    const labelColor = isDark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.30)';

    const len = slide.headline.length;
    const hlSize = (len > 55 ? 58 : len > 30 ? 70 : 84) * hs;
    const bdSize = 24 * bs;

    const hasPhoto = !!imageUrl;
    const isPhotoFull = hasPhoto && (slide.layout === 'full-image' || slide.layout === 'cta');
    const counter = totalSlides
      ? `${String(slide.number).padStart(2, '0')}/${String(totalSlides).padStart(2, '0')}`
      : null;

    const imgBaseStyle: React.CSSProperties = {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      objectFit: 'cover', zIndex: 0,
      opacity: imgOpacity,
      transform: `scale(${imgZoom}) translateY(${imgOffsetY}px)`,
      transformOrigin: 'center center',
    };

    // ── CLEAN-CARD (Brands Decoded Model 4) ───────────────────────────────────
    if (slide.layout === 'clean-card') {
      const cardAccent = bg === '#E8603C' ? '#FFFFFF' : '#E8603C';
      return (
        <div ref={ref} style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0, borderRadius: isExport ? 0 : 12 }}>
          <div className="slide-export" style={{
            width: 1080, height: 1350, position: 'absolute', top: 0, left: 0,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            backgroundColor: bg, fontFamily: 'Montserrat, sans-serif',
            display: 'flex', flexDirection: 'column',
            padding: '108px 88px 100px',
          }}>
            {/* Subtle radial bg accent */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0,
              background: isDark
                ? `radial-gradient(ellipse at 80% 20%, rgba(232,96,60,0.07) 0%, transparent 60%)`
                : `radial-gradient(ellipse at 80% 20%, rgba(232,96,60,0.05) 0%, transparent 60%)`,
            }} />
            {/* Slide counter top right */}
            {counter && (
              <span style={{ position: 'absolute', top: 56, right: 88, zIndex: 10,
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em',
                fontSize: 18, color: labelColor }}>
                {counter}
              </span>
            )}
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Accent line */}
              <div style={{ width: 56, height: 4, background: cardAccent, borderRadius: 2, marginBottom: 28, flexShrink: 0 }} />
              {/* Type label */}
              {!isExport && (
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: labelColor, marginBottom: 24, flexShrink: 0 }}>
                  ~{TYPE_LABELS[slide.type] || slide.type}
                </span>
              )}
              {/* Headline — in accent color, very impactful */}
              <h2 style={{
                fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.0,
                letterSpacing: '-0.03em',
                fontSize: (len > 55 ? 64 : len > 30 ? 80 : 96) * hs,
                color: cardAccent, margin: '0 0 40px', flexShrink: 0,
              }}>
                <HeadlineRenderer text={slide.headline} accentColor={cardAccent} headlineColor={cardAccent}
                  highlightWords={hlWords} highlightStyle={hlStyle} highlightColor={hlColor} isExport={isExport} />
              </h2>
              {/* Body */}
              {slide.bodyText && (
                <Body text={slide.bodyText} accent={cardAccent} color={bodyColor} size={bdSize} />
              )}
              {/* Source */}
              {slide.sourceLabel && (
                <span style={{ marginTop: 24, fontSize: 14, fontStyle: 'italic', color: labelColor, flexShrink: 0 }}>
                  ({slide.sourceLabel})
                </span>
              )}
              {/* Image card — inset, bottom-aligned */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginTop: 48 }}>
                <div style={{
                  width: '100%', height: 480, borderRadius: 24, overflow: 'hidden',
                  position: 'relative',
                  background: isDark
                    ? `linear-gradient(145deg, rgba(232,96,60,0.12) 0%, rgba(0,0,0,0.3) 100%)`
                    : `linear-gradient(145deg, rgba(232,96,60,0.08) 0%, rgba(0,0,0,0.06) 100%)`,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}>
                  {hasPhoto && (
                    <img src={imageUrl!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', opacity: imgOpacity,
                      transform: `scale(${imgZoom}) translateY(${imgOffsetY}px)`,
                      transformOrigin: 'center center' }} />
                  )}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ position: 'absolute', bottom: 52, left: 88, right: 88, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <DqMark size={48} isDark={isDark} />
              {!isExport && (
                <span style={{ fontWeight: 600, letterSpacing: '0.12em', fontSize: 16, color: labelColor }}>
                  arrasta →
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── QUOTE layout ──────────────────────────────────────────────────────────
    if (slide.layout === 'quote') {
      const quoteFontSize = (len > 55 ? 50 : len > 30 ? 60 : 70) * hs;
      return (
        <div ref={ref} style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0, borderRadius: isExport ? 0 : 12 }}>
          <div className="slide-export" style={{
            width: 1080, height: 1350, position: 'absolute', top: 0, left: 0,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            backgroundColor: bg, fontFamily: 'Montserrat, sans-serif',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '120px 100px',
          }}>
            {hasPhoto && <img src={imageUrl!} alt="" style={{ ...imgBaseStyle, opacity: imgOpacity * 0.14 }} />}
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', width: '100%' }}>
              {/* Large stylistic marks */}
              <div style={{ fontSize: 180, fontWeight: 900, lineHeight: 0.7, color: accent,
                opacity: 0.12, letterSpacing: '-0.05em', marginBottom: 48 }}>
                "
              </div>
              <h2 style={{
                fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.015em',
                fontSize: quoteFontSize, color: textColor, fontStyle: 'italic',
                margin: '0 0 36px',
                textShadow: hasPhoto ? '0 2px 24px rgba(0,0,0,0.6)' : 'none',
              }}>
                "<HeadlineRenderer text={slide.headline} accentColor={accent} headlineColor={textColor}
                  highlightWords={hlWords} highlightStyle={hlStyle} highlightColor={hlColor} isExport={isExport} />"
              </h2>
              {slide.bodyText && (
                <Body text={slide.bodyText} accent={accent} color={bodyColor} size={bdSize} />
              )}
              {slide.sourceLabel && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                  <div style={{ width: 40, height: 2, background: accent, opacity: 0.5 }} />
                  <span style={{ fontSize: 16, fontStyle: 'italic', color: accent, letterSpacing: '0.06em' }}>
                    {slide.sourceLabel}
                  </span>
                </div>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 52, right: 52, zIndex: 20 }}>
              <DqMark size={48} isDark={isDark} />
            </div>
          </div>
        </div>
      );
    }

    // ── SPLIT layout ──────────────────────────────────────────────────────────
    if (slide.layout === 'split') {
      const imgSide = slide.imageSide === 'left' ? 'left' : 'right';
      const splitHL = (len > 40 ? 54 : len > 20 ? 64 : 74) * hs;
      return (
        <div ref={ref} style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0, borderRadius: isExport ? 0 : 12 }}>
          <div className="slide-export" style={{
            width: 1080, height: 1350, position: 'absolute', top: 0, left: 0,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            backgroundColor: bg, fontFamily: 'Montserrat, sans-serif',
            display: 'flex', flexDirection: imgSide === 'left' ? 'row-reverse' : 'row',
          }}>
            {/* Text half */}
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', padding: '90px 72px', boxSizing: 'border-box' }}>
              <div style={{ width: 48, height: 4, background: accent, borderRadius: 2, marginBottom: 24 }} />
              {!isExport && (
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: labelColor, marginBottom: 20 }}>
                  ~{TYPE_LABELS[slide.type] || slide.type}
                </span>
              )}
              <h2 style={{ fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05,
                letterSpacing: '-0.025em', fontSize: splitHL,
                color: textColor, margin: '0 0 28px' }}>
                <HeadlineRenderer text={slide.headline} accentColor={accent} headlineColor={textColor}
                  highlightWords={hlWords} highlightStyle={hlStyle} highlightColor={hlColor} isExport={isExport} />
              </h2>
              {slide.bodyText && (
                <Body text={slide.bodyText} accent={accent} color={bodyColor} size={bdSize * 0.88} />
              )}
              {slide.sourceLabel && (
                <span style={{ marginTop: 20, fontSize: 13, fontStyle: 'italic', color: labelColor }}>
                  ({slide.sourceLabel})
                </span>
              )}
            </div>
            {/* Image half */}
            <div style={{ width: '50%', position: 'relative', overflow: 'hidden' }}>
              {hasPhoto ? (
                <img src={imageUrl!} alt="" style={{ position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: imgOpacity,
                  transform: `scale(${imgZoom}) translateY(${imgOffsetY}px)`,
                  transformOrigin: 'center center' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0,
                  background: `linear-gradient(145deg, ${accent}18 0%, ${bg} 70%)` }} />
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 52, right: 52, zIndex: 20 }}>
              <DqMark size={44} isDark={isDark} />
            </div>
          </div>
        </div>
      );
    }

    // ── EDITORIAL + TEXT-HEAVY + FULL-IMAGE + CTA (DQEF editorial template) ──
    return (
      <div ref={ref} style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0, borderRadius: isExport ? 0 : 12 }}>
        <div className="slide-export" style={{
          width: 1080, height: 1350, position: 'absolute', top: 0, left: 0,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          backgroundColor: isPhotoFull ? '#000' : bg,
          fontFamily: 'Montserrat, sans-serif',
        }}>
          {/* Background image */}
          {hasPhoto && (
            <img src={imageUrl!} alt="" style={imgBaseStyle} />
          )}
          {/* Photo gradient overlay */}
          {isPhotoFull && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.48) 48%, rgba(0,0,0,0.0) 78%)',
            }} />
          )}
          {/* Text-heavy: subtle image bg at low opacity */}
          {hasPhoto && slide.layout === 'text-heavy' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: pal.overlay }} />
          )}

          {/* Content */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            justifyContent: isPhotoFull ? 'flex-end' : (slide.layout === 'text-heavy' ? 'center' : 'flex-start'),
            padding: isPhotoFull
              ? '0 88px 120px'
              : slide.layout === 'cta'
                ? '0 88px'
                : '108px 88px 100px',
            alignItems: slide.layout === 'cta' ? 'center' : 'flex-start',
            textAlign: slide.layout === 'cta' ? 'center' : 'left',
          }}>

            {/* Accent line */}
            <div style={{ width: 60, height: 4, background: isPhotoFull ? '#E8603C' : accent,
              borderRadius: 2, marginBottom: 20, flexShrink: 0 }} />

            {/* Type label (not in export) */}
            {!isExport && !isPhotoFull && (
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: labelColor, marginBottom: 24, flexShrink: 0 }}>
                ~{TYPE_LABELS[slide.type] || slide.type}
              </span>
            )}

            {/* Headline */}
            <h2 style={{
              fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.0, letterSpacing: '-0.03em',
              fontSize: hlSize,
              color: isPhotoFull ? '#FFFFFF' : textColor,
              margin: '0 0 36px', flexShrink: 0,
              textShadow: isPhotoFull ? '0 2px 32px rgba(0,0,0,0.85)' : 'none',
            }}>
              <HeadlineRenderer text={slide.headline}
                accentColor={isPhotoFull ? '#E8603C' : accent}
                headlineColor={isPhotoFull ? '#FFFFFF' : textColor}
                highlightWords={hlWords} highlightStyle={hlStyle} highlightColor={hlColor} isExport={isExport} />
            </h2>

            {/* Body */}
            {slide.bodyText && slide.layout !== 'cta' && (
              slide.layout === 'text-heavy' ? (
                <div style={{ borderLeft: `3px solid ${accent}50`, paddingLeft: 28 }}>
                  <Body text={slide.bodyText} accent={accent}
                    color={isPhotoFull ? 'rgba(255,255,255,0.82)' : bodyColor} size={bdSize} />
                </div>
              ) : (
                <Body text={slide.bodyText} accent={accent}
                  color={isPhotoFull ? 'rgba(255,255,255,0.82)' : bodyColor} size={bdSize} />
              )
            )}

            {/* Source */}
            {slide.sourceLabel && (
              <span style={{ marginTop: 28, fontSize: 14, fontStyle: 'italic',
                color: isPhotoFull ? 'rgba(255,255,255,0.45)' : labelColor }}>
                ({slide.sourceLabel})
              </span>
            )}

            {/* CTA pill */}
            {slide.layout === 'cta' && (
              <div style={{
                marginTop: 44, display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '22px 48px', borderRadius: 999,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: 28 * bs, fontWeight: 400,
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)' }}>pronto.</span>
                <span style={{ fontSize: 28 * bs, fontWeight: 800, color: '#E8603C' }}>resolvido.</span>
              </div>
            )}
            {/* CTA body text */}
            {slide.layout === 'cta' && slide.bodyText && (
              <p style={{ fontSize: bdSize, color: bodyColor, lineHeight: 1.5,
                margin: '32px 0 0', maxWidth: 700, textAlign: 'center' }}>
                {slide.bodyText}
              </p>
            )}
          </div>

          {/* DQ mark */}
          <div style={{ position: 'absolute', bottom: 52, right: 52, zIndex: 20 }}>
            <DqMark size={isEditorial ? 52 : 44} isDark={isDark || isPhotoFull} />
          </div>

          {/* Slide counter (top right, not in export) */}
          {counter && !isExport && (
            <span style={{
              position: 'absolute', top: 52, right: 52, zIndex: 20,
              fontWeight: 700, letterSpacing: '0.1em', fontSize: 16, color: labelColor,
            }}>
              {counter}
            </span>
          )}
        </div>
      </div>
    );
  }
);

NarrativeSlidePreview.displayName = 'NarrativeSlidePreview';
