// ─── AI Task Types ───────────────────────────────────────────────────────────

export type AITaskType =
  | 'copy' | 'strategy' | 'classify' | 'suggest' | 'image'
  | 'image_hq' | 'analyze' | 'tag_image' | 'video' | 'reference' | 'auto';

// ─── Carousel Types ──────────────────────────────────────────────────────────

export type SlideType = 'hook' | 'setup' | 'data' | 'contrast' | 'validation' | 'cta';
export type SlideLayout = 'text-only' | 'text-photo-split' | 'number-dominant' | 'cta-clean';
export type BgStyle = 'dark' | 'orange' | 'dark-red' | 'dark-green';
export type AngleId = '' | 'RAIVA' | 'DINHEIRO' | 'ORGULHO' | 'URGÊNCIA' | 'ALÍVIO';

export interface SlideOutput {
  number: number;
  type: SlideType;
  headline: string;
  headlineHighlight?: string;
  subtext?: string;
  logic: string;
  visualDirection: string;
  needsMedia: boolean;
  mediaType?: 'photo' | 'video' | null;
  mediaDescription?: string | null;
  imagePrompt?: string | null;
  bgStyle: BgStyle;
  layout: SlideLayout;
}

export interface CarouselOutput {
  title: string;
  angle: string;
  angleEmoji: string;
  angleRationale: string;
  targetProfile: string;
  channel: string;
  viralLogic: string;
  designNotes: string;
  bestTime: string;
  caption: string;
  slides: SlideOutput[];
}

// ─── Narrative Carousel Types ────────────────────────────────────────────────

export type NarrativeSlideType =
  | 'hook' | 'context' | 'data' | 'tension' | 'pivot'
  | 'proof' | 'evidence' | 'insight' | 'cta';

export type NarrativeLayout = 'full-image' | 'split' | 'text-heavy' | 'quote' | 'cta';
export type NarrativeThemeId = 'editorial-dark' | 'editorial-cream' | 'brand-bold';

export interface NarrativeSlide {
  number: number;
  type: NarrativeSlideType;
  layout: NarrativeLayout;
  headline: string;
  bodyText?: string | null;
  sourceLabel?: string | null;
  imagePrompt?: string | null;
  imageSide?: 'full' | 'left' | 'right';
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export interface NarrativeCarouselOutput {
  title: string;
  theme: NarrativeThemeId;
  narrative_arc: string;
  target_connection: string;
  shareability_hook: string;
  caption: string;
  bestTime: string;
  slides: NarrativeSlide[];
}

// ─── Creative Batch Types ────────────────────────────────────────────────────

export type VisualStyleId =
  | 'impact-direct' | 'documentary' | 'social-proof'
  | 'provocation' | 'minimalist' | 'custom';

export interface BatchVariation {
  id: string;
  headline: string;
  subtext: string;
  cta: string;
  style: VisualStyleId;
  imagePrompt?: string;
  suggested_tags?: string[];
  mediaUrl?: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface BatchOutput {
  variations: BatchVariation[];
  briefing_analysis: string;
}

// ─── Media Library Types ─────────────────────────────────────────────────────

export type TaggingStatus = 'pending' | 'processing' | 'done' | 'error';
export type MediaMood = 'determinação' | 'alívio' | 'orgulho' | 'urgência' | 'raiva' | 'foco';

export interface MediaItem {
  id: string;
  workspace_id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  file_size: number;
  mime_type: string;
  category?: string | null;
  manual_tags?: string[];
  ai_tags?: string[];
  ai_description?: string | null;
  ai_mood?: MediaMood | null;
  ai_subjects?: string[];
  ai_colors?: string[];
  ai_style?: string | null;
  ai_fit_score_map?: Record<string, number>;
  tagging_status: TaggingStatus;
  created_at: string;
}

// ─── Creative Format ─────────────────────────────────────────────────────────

export interface CreativeFormat {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  ratio: string;
  safeZone: { top: number; right: number; bottom: number; left: number };
  notes?: string;
}

// ─── Visual Theme ────────────────────────────────────────────────────────────

export type CarouselThemeId = 'brand-orange' | 'clean-white' | 'dark-premium';

export interface CarouselTheme {
  id: CarouselThemeId;
  label: string;
  description: string;
  bg: string;
  overlayGradient: string;
  headlineColor: string;
  subtextColor: string;
  highlightColor: string;
  highlightBgOnImage: string;
  sloganDim: string;
  sloganBright: string;
  previewSwatch: string[];
}

// ─── Shape & Highlight Types ────────────────────────────────────────────────

export type ShapeStyle = 'none' | 'pill' | 'box' | 'diagonal' | 'gradient-bar' | 'circle-accent';
export type HighlightStyle = 'none' | 'color' | 'bold' | 'box';

export interface SlideSettings {
  textScale: number;
  ctaScale: number;
  textPositionX: number;
  textPositionY: number;
  imageOpacity: number;
  imageZoom: number;
  imageOffsetY: number;
  shape: ShapeStyle;
  highlightStyle: HighlightStyle;
  highlightWords: string;
  highlightColor: string;
  fontFamily: string;
}

export const DEFAULT_SLIDE_SETTINGS: SlideSettings = {
  textScale: 1.0,
  ctaScale: 1.0,
  textPositionX: 6,
  textPositionY: 70,
  imageOpacity: 1.0,
  imageZoom: 1.0,
  imageOffsetY: 0,
  shape: 'none',
  highlightStyle: 'none',
  highlightWords: '',
  highlightColor: '#E8603C',
  fontFamily: 'Montserrat',
};

// ─── Draft Types ─────────────────────────────────────────────────────────────

export type DraftType = 'carousel_direct' | 'carousel_narrative' | 'static_post' | 'batch';

export interface CreativeDraft {
  id: string;
  workspace_id: string;
  user_id: string;
  campaign_id: string | null;
  type: DraftType;
  title: string | null;
  data: Record<string, unknown>;
  status: 'draft' | 'approved' | 'published' | 'archived';
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}
