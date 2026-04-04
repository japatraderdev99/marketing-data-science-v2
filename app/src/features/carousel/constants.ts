import type { CreativeFormat, CarouselTheme, ShapeStyle, HighlightStyle } from '@/types';

export const ANGLES = [
  { id: '', label: 'IA Decide', emoji: '🤖', color: 'border-brand/40 text-brand' },
  { id: 'RAIVA', label: 'Raiva', emoji: '🔴', color: 'border-red-500/40 text-red-400' },
  { id: 'DINHEIRO', label: 'Dinheiro', emoji: '💸', color: 'border-yellow-500/40 text-yellow-400' },
  { id: 'ORGULHO', label: 'Orgulho', emoji: '🏆', color: 'border-amber-500/40 text-amber-400' },
  { id: 'URGÊNCIA', label: 'Urgência', emoji: '⏰', color: 'border-orange-500/40 text-orange-400' },
  { id: 'ALÍVIO', label: 'Alívio', emoji: '💚', color: 'border-green-500/40 text-green-400' },
] as const;

export const PERSONAS = [
  'Piscineiro', 'Eletricista', 'Encanador', 'Marido de Aluguel',
  'Pedreiro', 'Pintor', 'Jardineiro', 'Faxineira',
];

export const CHANNELS = ['Instagram Feed', 'Stories', 'TikTok', 'LinkedIn'];
export const TONES = ['Peer-to-peer', 'Editorial', 'Direto ao ponto'];

export const VISUAL_STYLES = [
  { id: 'impact-direct', label: 'Impacto Direto', desc: 'Bold, numbers, CTA forte' },
  { id: 'documentary', label: 'Documentário', desc: 'Foto real, tom autêntico' },
  { id: 'social-proof', label: 'Prova Social', desc: 'Depoimentos, resultados' },
  { id: 'provocation', label: 'Provocação', desc: 'Pergunta, polêmica, atenção' },
  { id: 'minimalist', label: 'Minimalista', desc: 'Clean, tipografia, respiro' },
  { id: 'custom', label: 'Personalizado', desc: 'Mix livre de estilos' },
] as const;

export const NICHOS = [
  'Construção', 'Elétrica', 'Hidráulica', 'Pintura', 'Jardinagem',
  'Limpeza', 'Manutenção', 'Piscina', 'Ar Condicionado', 'Marcenaria',
];

export const CREATIVE_FORMATS: CreativeFormat[] = [
  { id: 'ig-feed-4x5', label: 'Feed 4:5', platform: 'Instagram', width: 1080, height: 1350, ratio: '4:5', safeZone: { top: 90, right: 90, bottom: 90, left: 90 } },
  { id: 'ig-feed-1x1', label: 'Feed 1:1', platform: 'Instagram', width: 1080, height: 1080, ratio: '1:1', safeZone: { top: 90, right: 90, bottom: 90, left: 90 } },
  { id: 'ig-stories', label: 'Stories', platform: 'Instagram', width: 1080, height: 1920, ratio: '9:16', safeZone: { top: 250, right: 90, bottom: 350, left: 90 } },
  { id: 'li-feed-1x1', label: 'LinkedIn', platform: 'LinkedIn', width: 1200, height: 1200, ratio: '1:1', safeZone: { top: 100, right: 100, bottom: 100, left: 100 } },
  { id: 'tiktok-vertical', label: 'TikTok', platform: 'TikTok', width: 1080, height: 1920, ratio: '9:16', safeZone: { top: 200, right: 120, bottom: 400, left: 120 } },
];

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: 'brand-orange',
    label: 'Original',
    description: 'Laranja icônico da marca',
    bg: '#E8603C',
    overlayGradient: 'linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.05) 100%)',
    headlineColor: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.75)',
    highlightColor: '#E8603C',
    highlightBgOnImage: 'rgba(255,255,255,0.22)',
    sloganDim: 'rgba(255,255,255,0.45)',
    sloganBright: '#FFFFFF',
    previewSwatch: ['#E8603C', '#1A1A1A', '#FFFFFF'],
  },
  {
    id: 'clean-white',
    label: 'Clean',
    description: 'Fundo claro, tipografia bold',
    bg: '#F5F5F0',
    overlayGradient: 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 55%)',
    headlineColor: '#1A1A1A',
    subtextColor: 'rgba(26,26,26,0.65)',
    highlightColor: '#E8603C',
    highlightBgOnImage: 'rgba(232,96,60,0.15)',
    sloganDim: 'rgba(26,26,26,0.35)',
    sloganBright: '#E8603C',
    previewSwatch: ['#F5F5F0', '#E8603C', '#1A1A1A'],
  },
  {
    id: 'dark-premium',
    label: 'Dark',
    description: 'Escuro sofisticado',
    bg: '#0F0F0F',
    overlayGradient: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 55%)',
    headlineColor: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.65)',
    highlightColor: '#E8603C',
    highlightBgOnImage: 'rgba(232,96,60,0.25)',
    sloganDim: 'rgba(255,255,255,0.35)',
    sloganBright: '#E8603C',
    previewSwatch: ['#0F0F0F', '#E8603C', '#FFFFFF'],
  },
];

export const TYPE_LABELS: Record<string, string> = {
  hook: 'GANCHO', setup: 'SETUP', data: 'DADOS',
  contrast: 'CONTRASTE', validation: 'VALIDAÇÃO', cta: 'CTA',
  context: 'CONTEXTO', tension: 'TENSÃO', pivot: 'VIRADA',
  proof: 'PROVA', evidence: 'EVIDÊNCIA', insight: 'INSIGHT',
};

export const SHAPE_STYLES: { id: ShapeStyle; label: string; desc: string }[] = [
  { id: 'none', label: 'Sem Shape', desc: 'Texto direto sobre imagem' },
  { id: 'pill', label: 'Pill', desc: 'Fundo arredondado' },
  { id: 'box', label: 'Box', desc: 'Caixa sólida na base' },
  { id: 'diagonal', label: 'Diagonal', desc: 'Faixa diagonal' },
  { id: 'gradient-bar', label: 'Gradient Bar', desc: 'Barra gradiente' },
  { id: 'circle-accent', label: 'Círculo', desc: 'Destaque circular' },
];

export const HIGHLIGHT_STYLES: { id: HighlightStyle; label: string }[] = [
  { id: 'none', label: 'Nenhum' },
  { id: 'color', label: 'Cor accent' },
  { id: 'bold', label: 'Bold+sombra' },
  { id: 'box', label: 'Caixa colorida' },
];

export const FONT_OPTIONS = [
  'Montserrat', 'Oswald', 'Bebas Neue', 'Anton', 'Teko', 'Inter',
];

export const PREVIEW_BASE_WIDTH = 340;
