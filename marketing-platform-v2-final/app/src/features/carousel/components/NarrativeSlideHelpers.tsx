import type { NarrativeThemeId, HighlightStyle } from '@/types';
import dqefIconOrange from '@/assets/dqef-icon-orange.png';
import dqefLogoWhite from '@/assets/dqef-logo-white.png';
import { renderHighlightedText } from './WordHighlight';

// ── Palette ───────────────────────────────────────────────────────────────────

export const NARRATIVE_PALETTE: Record<NarrativeThemeId, { bg: string; text: string; accent: string; overlay: string }> = {
  'editorial-dark':  { bg: '#0F0F0F', text: '#FFFFFF', accent: '#E8603C', overlay: 'rgba(0,0,0,0.82)' },
  'editorial-cream': { bg: '#F5F0E8', text: '#111111', accent: '#E8603C', overlay: 'rgba(245,240,232,0.88)' },
  'brand-bold':      { bg: '#E8603C', text: '#FFFFFF', accent: '#FFFFFF', overlay: 'rgba(232,96,60,0.78)' },
  'dqef-editorial':  { bg: '#F7F2EB', text: '#111111', accent: '#E8603C', overlay: 'rgba(0,0,0,0.82)' },
};

// ── Accent text renderer (supports **bold**) ──────────────────────────────────

export function Accent({ text, color }: { text: string; color: string }) {
  return (
    <>
      {text.split(/(\*\*.*?\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <span key={i} style={{ color }}>{p.slice(2, -2)}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ── Body text renderer (list or paragraph, supports **bold**) ─────────────────

export function Body({ text, accent, color, size }: { text: string; accent: string; color: string; size: number }) {
  const lines = text.split('\n').filter(Boolean);
  const base: React.CSSProperties = {
    fontSize: size, color, lineHeight: 1.58, margin: 0,
    fontFamily: 'Montserrat, sans-serif', fontWeight: 400,
  };
  if (lines.length > 1) {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {lines.map((line, i) => (
          <li key={i} style={{ display: 'flex', gap: 18, marginBottom: 14, ...base }}>
            <span style={{ color: accent, flexShrink: 0, fontWeight: 700 }}>→</span>
            <span>{line.replace(/^[-•→·\d.]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p style={base}>
      {text.split(/(\*\*.*?\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: accent, fontWeight: 800 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </p>
  );
}

// ── Headline renderer — Accent OR user highlight ──────────────────────────────

export function HeadlineRenderer({
  text, accentColor, headlineColor,
  highlightWords, highlightStyle = 'none', highlightColor = '#E8603C',
  isExport = false,
}: {
  text: string; accentColor: string; headlineColor: string;
  highlightWords?: string; highlightStyle?: HighlightStyle; highlightColor?: string;
  isExport?: boolean;
}) {
  if (highlightStyle !== 'none' && highlightWords) {
    return renderHighlightedText(text, highlightWords, highlightStyle, headlineColor, highlightColor, isExport);
  }
  return <Accent text={text} color={accentColor} />;
}

// ── DQEF brand mark — real asset ─────────────────────────────────────────────
// isDark: use white logo (light bg on dark/orange)
// !isDark: use orange icon (on cream/light)

export function DqMark({ size = 56, isDark = true }: { size?: number; isDark?: boolean }) {
  return (
    <img
      src={isDark ? dqefLogoWhite : dqefIconOrange}
      alt="DQEF"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
