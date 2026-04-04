// Format specifications: channel + creative type -> pixel dimensions
// Extracted from Formatos.tsx platform data

export interface FormatSpec {
  width: number;
  height: number;
  ratio: string;
  name: string;
  creativeRoute: string; // '/criativo' | '/video-ia' | '/ai-carrosseis'
}

export type CreativeType = 'carrossel' | 'reels' | 'stories' | 'post' | 'video' | 'ads' | 'shorts';

// Maps channel + creative_type to pixel specs
const FORMAT_MAP: Record<string, FormatSpec> = {
  // Instagram
  'Instagram|carrossel': { width: 1080, height: 1350, ratio: '4:5', name: 'Carrossel Feed (Portrait)', creativeRoute: '/ai-carrosseis' },
  'Instagram|post': { width: 1080, height: 1350, ratio: '4:5', name: 'Post Feed (Portrait)', creativeRoute: '/criativo' },
  'Instagram|reels': { width: 1080, height: 1920, ratio: '9:16', name: 'Reels (Vertical)', creativeRoute: '/video-ia' },
  'Instagram|stories': { width: 1080, height: 1920, ratio: '9:16', name: 'Stories (Vertical)', creativeRoute: '/video-ia' },
  'Instagram|ads': { width: 1080, height: 1080, ratio: '1:1', name: 'Feed Ads (Square)', creativeRoute: '/criativo' },

  // TikTok
  'TikTok|video': { width: 1080, height: 1920, ratio: '9:16', name: 'Video TikTok (Vertical)', creativeRoute: '/video-ia' },
  'TikTok|reels': { width: 1080, height: 1920, ratio: '9:16', name: 'Video TikTok (Vertical)', creativeRoute: '/video-ia' },
  'TikTok|ads': { width: 1080, height: 1920, ratio: '9:16', name: 'TikTok Ads (Vertical)', creativeRoute: '/video-ia' },

  // YouTube
  'YouTube|video': { width: 1920, height: 1080, ratio: '16:9', name: 'YouTube Video (Landscape)', creativeRoute: '/video-ia' },
  'YouTube|shorts': { width: 1080, height: 1920, ratio: '9:16', name: 'YouTube Shorts (Vertical)', creativeRoute: '/video-ia' },

  // LinkedIn
  'LinkedIn|post': { width: 1200, height: 627, ratio: '1.91:1', name: 'LinkedIn Post (Landscape)', creativeRoute: '/criativo' },
  'LinkedIn|carrossel': { width: 1080, height: 1080, ratio: '1:1', name: 'LinkedIn Carrossel (Square)', creativeRoute: '/ai-carrosseis' },
  'LinkedIn|ads': { width: 1200, height: 627, ratio: '1.91:1', name: 'LinkedIn Ads (Landscape)', creativeRoute: '/criativo' },

  // Meta Ads
  'Meta Ads|ads': { width: 1080, height: 1080, ratio: '1:1', name: 'Meta Ads (Square)', creativeRoute: '/criativo' },
  'Meta Ads|reels': { width: 1080, height: 1920, ratio: '9:16', name: 'Meta Reels Ads (Vertical)', creativeRoute: '/video-ia' },
  'Meta Ads|carrossel': { width: 1080, height: 1080, ratio: '1:1', name: 'Meta Carrossel Ads (Square)', creativeRoute: '/ai-carrosseis' },

  // Orgânico (defaults to Instagram-like)
  'Orgânico|post': { width: 1080, height: 1350, ratio: '4:5', name: 'Post Orgânico (Portrait)', creativeRoute: '/criativo' },
  'Orgânico|carrossel': { width: 1080, height: 1350, ratio: '4:5', name: 'Carrossel Orgânico (Portrait)', creativeRoute: '/ai-carrosseis' },
  'Orgânico|reels': { width: 1080, height: 1920, ratio: '9:16', name: 'Reels Orgânico (Vertical)', creativeRoute: '/video-ia' },
};

// Default fallback
const DEFAULT_SPEC: FormatSpec = { width: 1080, height: 1080, ratio: '1:1', name: 'Formato Padrão (Square)', creativeRoute: '/criativo' };

export function getFormatSpec(channel: string, creativeType: CreativeType): FormatSpec {
  return FORMAT_MAP[`${channel}|${creativeType}`] || DEFAULT_SPEC;
}

// Given a channel, return which creative types make sense
export function getCreativeTypesForChannel(channel: string): CreativeType[] {
  const types: CreativeType[] = [];
  const keys = Object.keys(FORMAT_MAP).filter(k => k.startsWith(`${channel}|`));
  keys.forEach(k => {
    const type = k.split('|')[1] as CreativeType;
    if (!types.includes(type)) types.push(type);
  });
  return types.length > 0 ? types : ['post'];
}

// Map ContentFormat (from seedData) to CreativeType
export function contentFormatToCreativeType(format: string): CreativeType {
  const map: Record<string, CreativeType> = {
    'Carrossel': 'carrossel',
    'Reels': 'reels',
    'Stories': 'stories',
    'Post': 'post',
    'Ads': 'ads',
    'Shorts': 'shorts',
  };
  return map[format] || 'post';
}
