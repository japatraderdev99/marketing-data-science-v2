import { forwardRef } from 'react';
import type { NarrativeSlide, NarrativeThemeId } from '@/types';
import { TYPE_LABELS } from '../constants';

// ── Theme palette ────────────────────────────────────────────────────────────

const THEME: Record<NarrativeThemeId, { bg: string; text: string; accent: string; overlay: string }> = {
  'editorial-dark':  { bg: '#0F0F0F', text: '#FFFFFF', accent: '#E8603C', overlay: 'rgba(0,0,0,0.72)' },
  'editorial-cream': { bg: '#F5F0E8', text: '#1A1A1A', accent: '#E8603C', overlay: 'rgba(245,240,232,0.8)' },
  'brand-bold':      { bg: '#E8603C', text: '#FFFFFF', accent: '#FFFFFF', overlay: 'rgba(232,96,60,0.72)' },
  'dqef-editorial':  { bg: '#F7F2EB', text: '#111111', accent: '#E8603C', overlay: 'rgba(0,0,0,0.72)' },
};

// ── Settings ─────────────────────────────────────────────────────────────────

export interface NarrativeSlideSettings {
  textScale?: number;
  imageOpacity?: number;
  imageZoom?: number;
  imageOffsetY?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Accent({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <span key={i} style={{ color }}>{p.slice(2, -2)}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

function BodyText({ text, accent, color, size }: { text: string; accent: string; color: string; size: number }) {
  const lines = text.split('\n').filter(Boolean);
  const baseStyle: React.CSSProperties = { fontSize: size, color, lineHeight: 1.65, margin: 0 };
  if (lines.length > 1) {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {lines.map((line, i) => (
          <li key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, ...baseStyle }}>
            <span style={{ color: accent, flexShrink: 0, fontWeight: 700 }}>→</span>
            <span>{line.replace(/^[-•→·]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <p style={baseStyle}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: accent, fontWeight: 800 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </p>
  );
}

// Pure CSS logo mark — renders correctly inside html-to-image
function DqefMark({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, background: '#E8603C',
      borderRadius: Math.round(size * 0.22),
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{
        color: '#fff', fontSize: Math.round(size * 0.38), fontWeight: 900,
        fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.04em', lineHeight: 1,
      }}>DQ</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

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
    const previewScale = width / 1080;
    const palette = THEME[theme] ?? THEME['editorial-dark'];
    const accent = slide.accentColor || palette.accent;
    const ts = settings?.textScale ?? 1.0;
    const imgOpacity = settings?.imageOpacity ?? 1.0;
    const imgZoom = settings?.imageZoom ?? 1.0;
    const imgOffsetY = settings?.imageOffsetY ?? 0;
    const isEditorial = theme === 'dqef-editorial';

    // Resolve bg / text color (editorial cycles automatically by slide number)
    let bg = slide.bgColor || palette.bg;
    let textColor = slide.textColor || palette.text;
    if (isEditorial && !slide.bgColor) {
      if (slide.number % 3 === 0)      { bg = '#E8603C'; textColor = '#FFFFFF'; }
      else if (slide.number % 2 === 0) { bg = '#0F0F0F'; textColor = '#FFFFFF'; }
      else                             { bg = '#F7F2EB'; textColor = '#111111'; }
    }
    const isDark = textColor === '#FFFFFF';
    const bodyColor = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.62)';
    const isPhotoSlide = !!imageUrl && (slide.layout === 'full-image' || slide.layout === 'cta');

    return (
      <div ref={ref} style={{
        width, height, overflow: 'hidden', position: 'relative', flexShrink: 0,
        borderRadius: isExport ? 0 : 12,
      }}>
        {/* ── Inner design canvas — always 1080×1350, scaled to preview ── */}
        <div className="slide-export" style={{
          width: 1080, height: 1350, position: 'absolute', top: 0, left: 0,
          transform: `scale(${previewScale})`, transformOrigin: 'top left',
          backgroundColor: isPhotoSlide ? '#000' : bg,
          fontFamily: 'Montserrat, sans-serif',
        }}>

          {/* Background image */}
          {imageUrl && (
            <>
              <img src={imageUrl} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', zIndex: 0,
                opacity: imgOpacity,
                transform: `scale(${imgZoom}) translateY(${imgOffsetY}px)`,
                transformOrigin: 'center center',
              }} />
              {isPhotoSlide && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `linear-gradient(to top, ${palette.overlay} 0%, rgba(0,0,0,0.1) 60%)` }} />
              )}
              {!isPhotoSlide && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundColor: bg, opacity: 0.9 }} />
              )}
            </>
          )}

          {/* Split layout image panel */}
          {imageUrl && slide.layout === 'split' && (
            <div style={{ position: 'absolute', top: 0, height: '100%', width: '50%', zIndex: 0, [slide.imageSide === 'left' ? 'left' : 'right']: 0 }}>
              <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgOpacity }} />
            </div>
          )}

          {isEditorial ? (
            // ─── DQEF EDITORIAL TEMPLATE ────────────────────────────────────
            <>
              {/* Top bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 56, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 40px',
                borderBottom: isDark || isPhotoSlide ? 'none' : '1px solid rgba(0,0,0,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DqefMark size={28} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isDark || isPhotoSlide ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)' }}>
                    DQEF Studio
                  </span>
                </div>
                <span style={{ fontSize: 9, letterSpacing: '0.05em', color: isDark || isPhotoSlide ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.26)' }}>
                  @deixaqueeufaco{totalSlides ? ` · ${slide.number}/${totalSlides}` : ''}
                </span>
              </div>

              {/* Content area */}
              <div style={{
                position: 'absolute', top: 56, bottom: 60, left: 0, right: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column',
                justifyContent: isPhotoSlide ? 'flex-end' : 'flex-start',
                padding: '60px',
                ...(slide.layout === 'split' && slide.imageSide === 'left' ? { paddingLeft: '55%' } : {}),
                ...(slide.layout === 'split' && slide.imageSide === 'right' ? { paddingRight: '55%' } : {}),
              }}>
                <h2 style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 900,
                  textTransform: 'uppercase', lineHeight: 0.95, letterSpacing: '-0.03em',
                  fontSize: (slide.headline.length > 55 ? 56 : 72) * ts,
                  color: isPhotoSlide ? '#FFFFFF' : textColor,
                  margin: '0 0 36px 0',
                  textShadow: isPhotoSlide ? '0 2px 32px rgba(0,0,0,0.85)' : 'none',
                }}>
                  <Accent text={slide.headline} color={isPhotoSlide ? accent : accent} />
                </h2>

                {slide.bodyText && (
                  <BodyText
                    text={slide.bodyText} accent={accent}
                    color={isPhotoSlide ? 'rgba(255,255,255,0.82)' : bodyColor}
                    size={18 * ts}
                  />
                )}

                {slide.sourceLabel && (
                  <span style={{ display: 'inline-block', marginTop: 24, fontSize: 10, fontStyle: 'italic', color: isDark || isPhotoSlide ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)' }}>
                    Fonte: {slide.sourceLabel}
                  </span>
                )}

                {slide.type === 'cta' && (
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.04em', fontSize: 16 * ts, color: isPhotoSlide ? '#FFFFFF' : accent, margin: '28px 0 0' }}>
                    pronto. resolvido.
                  </p>
                )}
              </div>

              {/* Bottom bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 10 }}>
                <div style={{ position: 'absolute', top: 0, left: 40, right: 40, height: 4, background: '#E8603C', borderRadius: 2 }} />
                <span style={{ position: 'absolute', bottom: 20, right: 40, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: isDark || isPhotoSlide ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.22)' }}>
                  {slide.number}{totalSlides ? `/${totalSlides}` : ''}
                </span>
              </div>
            </>
          ) : (
            // ─── STANDARD TEMPLATE ──────────────────────────────────────────
            <>
              <div style={{
                position: 'absolute', top: 0, left: 0, zIndex: 10,
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '4px 10px',
                backgroundColor: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.6)',
                borderBottomRightRadius: 6,
              }}>
                {TYPE_LABELS[slide.type] || slide.type.toUpperCase()}
              </div>

              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', padding: 28, zIndex: 10,
                ...(slide.layout === 'split' && slide.imageSide === 'left' ? { paddingLeft: '55%' } : {}),
                ...(slide.layout === 'split' && slide.imageSide === 'right' ? { paddingRight: '55%' } : {}),
              }}>
                <h2 style={{
                  fontFamily: 'Montserrat, sans-serif', fontWeight: 900,
                  textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.02em',
                  fontSize: (slide.layout === 'quote' ? 32 : 36) * ts,
                  color: textColor, margin: '0 0 10px',
                  textShadow: imageUrl ? '0 2px 24px rgba(0,0,0,0.7)' : 'none',
                }}>
                  <Accent text={slide.headline} color={accent} />
                </h2>

                {slide.bodyText && (
                  <BodyText text={slide.bodyText} accent={accent} color={`${textColor}cc`} size={13 * ts} />
                )}

                {slide.sourceLabel && (
                  <span style={{ display: 'inline-block', fontStyle: 'italic', fontSize: 9, color: `${textColor}80`, marginTop: 6 }}>
                    Fonte: {slide.sourceLabel}
                  </span>
                )}

                {slide.type === 'cta' && (
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.05em', fontSize: 12 * ts, color: accent, margin: '14px 0 0' }}>
                    pronto. resolvido.
                  </p>
                )}
              </div>

              <span style={{ position: 'absolute', bottom: 8, right: 10, zIndex: 10, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 9, color: `${textColor}30` }}>
                {slide.number}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }
);

NarrativeSlidePreview.displayName = 'NarrativeSlidePreview';
