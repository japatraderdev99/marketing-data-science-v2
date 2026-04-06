import type { ShapeStyle, CarouselTheme } from '@/types';

const BRAND = '#E8603C';

interface ShapeOverlayProps {
  shape: ShapeStyle;
  theme: CarouselTheme;
  isExport?: boolean;
}

export function ShapeOverlay({ shape, theme, isExport = false }: ShapeOverlayProps) {
  const isDark = theme.id !== 'clean-white';

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
            background: `linear-gradient(90deg, ${BRAND}, ${BRAND}80, transparent)`,
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
            background: `linear-gradient(90deg, ${BRAND}, #FF8A65, ${BRAND})`,
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
            background: `radial-gradient(circle, ${BRAND}50, ${BRAND}20)`,
            border: `2px solid ${BRAND}66`,
            boxShadow: `0 0 30px ${BRAND}30`,
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
