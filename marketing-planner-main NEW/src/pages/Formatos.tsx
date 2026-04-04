import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormatSpec {
  name: string;
  width: number;
  height: number;
  ratio: string;
  type: 'image' | 'video' | 'both';
  device: 'desktop' | 'mobile' | 'all';
  recommended?: boolean;
  maxFileSizeMB?: number;
  notes?: string;
}

interface PlatformSection {
  id: string;
  platform: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  formats: { category: string; items: FormatSpec[] }[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PLATFORMS: PlatformSection[] = [
  {
    id: 'instagram',
    platform: 'Instagram',
    emoji: '📸',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    formats: [
      {
        category: 'Feed (Orgânico & Ads)',
        items: [
          { name: 'Quadrado Feed', width: 1080, height: 1080, ratio: '1:1', type: 'both', device: 'all', recommended: true, maxFileSizeMB: 30 },
          { name: 'Vertical Feed (Portrait)', width: 1080, height: 1350, ratio: '4:5', type: 'both', device: 'mobile', recommended: true, maxFileSizeMB: 30, notes: 'Ocupa mais espaço no feed — maior impacto' },
          { name: 'Paisagem Feed', width: 1080, height: 566, ratio: '1.91:1', type: 'both', device: 'all', maxFileSizeMB: 30 },
        ],
      },
      {
        category: 'Stories & Reels',
        items: [
          { name: 'Stories / Reels', width: 1080, height: 1920, ratio: '9:16', type: 'both', device: 'mobile', recommended: true, maxFileSizeMB: 30, notes: 'Zona segura: evitar bordas 250px topo/base' },
          { name: 'Stories Paisagem', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'all', maxFileSizeMB: 30 },
        ],
      },
      {
        category: 'Carrossel',
        items: [
          { name: 'Carrossel Quadrado', width: 1080, height: 1080, ratio: '1:1', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 30 },
          { name: 'Carrossel Vertical', width: 1080, height: 1350, ratio: '4:5', type: 'image', device: 'mobile', recommended: true, maxFileSizeMB: 30 },
          { name: 'Carrossel Explore', width: 1080, height: 1920, ratio: '9:16', type: 'image', device: 'mobile', maxFileSizeMB: 30 },
        ],
      },
    ],
  },
  {
    id: 'facebook',
    platform: 'Facebook / Meta',
    emoji: '👥',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    formats: [
      {
        category: 'Feed (Orgânico & Ads)',
        items: [
          { name: 'Feed Quadrado', width: 1080, height: 1080, ratio: '1:1', type: 'both', device: 'all', recommended: true, maxFileSizeMB: 30 },
          { name: 'Feed Vertical', width: 1080, height: 1350, ratio: '4:5', type: 'both', device: 'mobile', recommended: true, maxFileSizeMB: 30 },
          { name: 'Feed Paisagem', width: 1200, height: 628, ratio: '1.91:1', type: 'both', device: 'desktop', maxFileSizeMB: 30, notes: 'Padrão para Link Ads' },
        ],
      },
      {
        category: 'Stories & Reels',
        items: [
          { name: 'Stories / Reels', width: 1080, height: 1920, ratio: '9:16', type: 'both', device: 'mobile', recommended: true, maxFileSizeMB: 30 },
        ],
      },
      {
        category: 'Carrossel',
        items: [
          { name: 'Carrossel Quadrado', width: 1080, height: 1080, ratio: '1:1', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 30 },
        ],
      },
      {
        category: 'Marketplace & Messenger',
        items: [
          { name: 'Marketplace Ad', width: 1080, height: 1080, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 30 },
          { name: 'Messenger Feed', width: 1200, height: 628, ratio: '1.91:1', type: 'image', device: 'all', maxFileSizeMB: 30 },
          { name: 'Messenger Stories', width: 1080, height: 1920, ratio: '9:16', type: 'image', device: 'mobile', maxFileSizeMB: 30 },
        ],
      },
    ],
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    emoji: '🎵',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    formats: [
      {
        category: 'In-Feed & TopView',
        items: [
          { name: 'In-Feed Video', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', recommended: true, maxFileSizeMB: 500, notes: 'Formato principal — full-screen nativo' },
          { name: 'Landscape (opcional)', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'all', maxFileSizeMB: 500 },
          { name: 'Quadrado', width: 1080, height: 1080, ratio: '1:1', type: 'video', device: 'all', maxFileSizeMB: 500 },
        ],
      },
      {
        category: 'TopView Ads',
        items: [
          { name: 'TopView Vertical', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', recommended: true, maxFileSizeMB: 500, notes: '5-60s, aparece imediatamente ao abrir o app' },
        ],
      },
      {
        category: 'Spark Ads & Branded',
        items: [
          { name: 'Spark Ad', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', recommended: true, maxFileSizeMB: 500, notes: 'Impulsiona conteúdo orgânico existente' },
          { name: 'Branded Hashtag Challenge', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', maxFileSizeMB: 500 },
        ],
      },
      {
        category: 'Imagens (Photo Mode)',
        items: [
          { name: 'Photo Ad Vertical', width: 1080, height: 1920, ratio: '9:16', type: 'image', device: 'mobile', recommended: true, maxFileSizeMB: 30 },
          { name: 'Photo Ad Quadrado', width: 1080, height: 1080, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 30 },
        ],
      },
    ],
  },
  {
    id: 'linkedin',
    platform: 'LinkedIn',
    emoji: '💼',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    formats: [
      {
        category: 'Single Image Ad',
        items: [
          { name: 'Quadrado', width: 1200, height: 1200, ratio: '1:1', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 5 },
          { name: 'Horizontal', width: 1200, height: 628, ratio: '1.91:1', type: 'image', device: 'desktop', recommended: true, maxFileSizeMB: 5, notes: 'Padrão para sponsored content' },
          { name: 'Vertical', width: 628, height: 1200, ratio: '1:1.91', type: 'image', device: 'mobile', maxFileSizeMB: 5 },
        ],
      },
      {
        category: 'Carrossel Ads',
        items: [
          { name: 'Carrossel Quadrado', width: 1080, height: 1080, ratio: '1:1', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 10, notes: '2-10 cards por carrossel' },
          { name: 'Carrossel Horizontal', width: 1200, height: 628, ratio: '1.91:1', type: 'image', device: 'desktop', maxFileSizeMB: 10 },
        ],
      },
      {
        category: 'Video Ads',
        items: [
          { name: 'Quadrado Video', width: 1200, height: 1200, ratio: '1:1', type: 'video', device: 'all', recommended: true, maxFileSizeMB: 200 },
          { name: 'Landscape Video', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'desktop', maxFileSizeMB: 200 },
          { name: 'Portrait Video', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', maxFileSizeMB: 200 },
        ],
      },
      {
        category: 'Thought Leader & Document',
        items: [
          { name: 'Document Ad (PDF)', width: 1200, height: 628, ratio: '1.91:1', type: 'image', device: 'all', maxFileSizeMB: 100, notes: 'Até 300 páginas em PDF' },
          { name: 'Thought Leader Ad', width: 1200, height: 1200, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 5 },
        ],
      },
    ],
  },
  {
    id: 'google-display',
    platform: 'Google Display',
    emoji: '🎯',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    formats: [
      {
        category: '🏆 Mais Performáticos (Top Performers)',
        items: [
          { name: 'Leaderboard', width: 728, height: 90, ratio: '8.09:1', type: 'image', device: 'desktop', recommended: true, maxFileSizeMB: 0.15, notes: 'Maior volume de impressões — topo de página' },
          { name: 'Medium Rectangle', width: 300, height: 250, ratio: '6:5', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 0.15, notes: 'Formato #1 em volume global — sidebar e inline' },
          { name: 'Large Rectangle', width: 336, height: 280, ratio: '6:5', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 0.15, notes: 'Alta CTR — premium de content' },
          { name: 'Half Page (Large Format)', width: 300, height: 600, ratio: '1:2', type: 'image', device: 'desktop', recommended: true, maxFileSizeMB: 0.15, notes: 'Impacto máximo — premium inventory' },
        ],
      },
      {
        category: 'Desktop Banners',
        items: [
          { name: 'Billboard', width: 970, height: 250, ratio: '3.88:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Wide Skyscraper', width: 160, height: 600, ratio: '4:15', type: 'image', device: 'desktop', recommended: true, maxFileSizeMB: 0.15, notes: 'Sidebar lateral de alta visibilidade' },
          { name: 'Skyscraper', width: 120, height: 600, ratio: '1:5', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Banner', width: 468, height: 60, ratio: '7.8:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Large Leaderboard', width: 970, height: 90, ratio: '10.78:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Portrait', width: 300, height: 1050, ratio: '2:7', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Panorama', width: 980, height: 120, ratio: '8.17:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Triple Widescreen', width: 250, height: 360, ratio: '5:7.2', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Small Rectangle', width: 180, height: 150, ratio: '6:5', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
          { name: 'Square', width: 250, height: 250, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 0.15 },
          { name: 'Small Square', width: 200, height: 200, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 0.15 },
          { name: 'Vertical Rectangle', width: 240, height: 400, ratio: '3:5', type: 'image', device: 'desktop', maxFileSizeMB: 0.15 },
        ],
      },
      {
        category: 'Mobile Banners',
        items: [
          { name: 'Mobile Banner', width: 320, height: 50, ratio: '6.4:1', type: 'image', device: 'mobile', recommended: true, maxFileSizeMB: 0.15, notes: 'Formato padrão mobile — rodapé de tela' },
          { name: 'Mobile Large Banner', width: 320, height: 100, ratio: '3.2:1', type: 'image', device: 'mobile', recommended: true, maxFileSizeMB: 0.15 },
          { name: 'Mobile Full Screen Interstitial', width: 320, height: 480, ratio: '2:3', type: 'image', device: 'mobile', maxFileSizeMB: 0.15, notes: 'Aparece em transições entre telas de apps' },
          { name: 'Mobile Interstitial 2', width: 480, height: 320, ratio: '3:2', type: 'image', device: 'mobile', maxFileSizeMB: 0.15 },
          { name: 'Small Mobile Banner', width: 300, height: 50, ratio: '6:1', type: 'image', device: 'mobile', maxFileSizeMB: 0.15 },
        ],
      },
      {
        category: 'Performance Max & Responsive',
        items: [
          { name: 'Responsive Display Ad (Landscape)', width: 1200, height: 628, ratio: '1.91:1', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 5, notes: 'Google adapta automaticamente para qualquer slot' },
          { name: 'Responsive Display Ad (Square)', width: 1200, height: 1200, ratio: '1:1', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 5 },
          { name: 'Logo Square', width: 1200, height: 1200, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 5, notes: 'Logo da marca para Responsive Ads' },
          { name: 'Logo Landscape', width: 1200, height: 300, ratio: '4:1', type: 'image', device: 'all', maxFileSizeMB: 5 },
          { name: 'Perf Max Video', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'all', maxFileSizeMB: 256, notes: 'YouTube + Display Network combinados' },
        ],
      },
    ],
  },
  {
    id: 'youtube',
    platform: 'YouTube',
    emoji: '▶️',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    formats: [
      {
        category: 'Vídeo Ads',
        items: [
          { name: 'Skippable In-Stream', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'all', recommended: true, maxFileSizeMB: 256, notes: 'Pulável após 5s — ideal para brand awareness' },
          { name: 'Non-Skippable In-Stream', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'all', recommended: true, maxFileSizeMB: 256, notes: '15-20s obrigatório — alta atenção garantida' },
          { name: 'Bumper Ad', width: 1920, height: 1080, ratio: '16:9', type: 'video', device: 'all', maxFileSizeMB: 256, notes: '6s — recall de marca muito eficiente' },
          { name: 'YouTube Shorts Ad', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', recommended: true, maxFileSizeMB: 256, notes: 'Vertical nativo — crescimento explosivo 2024-25' },
        ],
      },
      {
        category: 'Display no YouTube',
        items: [
          { name: 'Display Ad (Companion Banner)', width: 300, height: 250, ratio: '6:5', type: 'image', device: 'desktop', recommended: true, maxFileSizeMB: 0.15, notes: 'Aparece ao lado do vídeo em desktop' },
          { name: 'Overlay Ad', width: 728, height: 90, ratio: '8.09:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.15, notes: 'Transparente sobre o vídeo — parte inferior' },
          { name: 'Masthead (Desktop)', width: 970, height: 250, ratio: '3.88:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.15, notes: 'Posição premium — topo da homepage YT' },
          { name: 'Masthead (Mobile)', width: 640, height: 360, ratio: '16:9', type: 'image', device: 'mobile', maxFileSizeMB: 0.15 },
        ],
      },
      {
        category: 'Thumbnail & Canal',
        items: [
          { name: 'Thumbnail', width: 1280, height: 720, ratio: '16:9', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 2 },
          { name: 'Channel Art (Banner)', width: 2560, height: 1440, ratio: '16:9', type: 'image', device: 'all', maxFileSizeMB: 6 },
          { name: 'Profile Photo', width: 800, height: 800, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 4 },
        ],
      },
    ],
  },
  {
    id: 'tiktok-google',
    platform: 'Pinterest & X/Twitter',
    emoji: '📌',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    formats: [
      {
        category: 'Pinterest Ads',
        items: [
          { name: 'Standard Pin', width: 1000, height: 1500, ratio: '2:3', type: 'both', device: 'all', recommended: true, maxFileSizeMB: 32, notes: 'Formato nativo Pinterest — melhor performance' },
          { name: 'Square Pin', width: 1000, height: 1000, ratio: '1:1', type: 'both', device: 'all', maxFileSizeMB: 32 },
          { name: 'Short Pin', width: 1000, height: 750, ratio: '4:3', type: 'both', device: 'all', maxFileSizeMB: 32 },
          { name: 'Ideia Pin (Vertical)', width: 1080, height: 1920, ratio: '9:16', type: 'video', device: 'mobile', recommended: true, maxFileSizeMB: 100, notes: 'Formato Stories do Pinterest' },
        ],
      },
      {
        category: 'X (Twitter) Ads',
        items: [
          { name: 'Single Image Tweet', width: 1200, height: 675, ratio: '16:9', type: 'image', device: 'all', recommended: true, maxFileSizeMB: 5, notes: 'Formato horizontal padrão do feed' },
          { name: 'Image Ad (Square)', width: 800, height: 800, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 5 },
          { name: 'Carrossel X', width: 800, height: 800, ratio: '1:1', type: 'image', device: 'all', maxFileSizeMB: 5, notes: '2-6 cards por carrossel' },
          { name: 'App Card', width: 800, height: 418, ratio: '1.91:1', type: 'image', device: 'mobile', maxFileSizeMB: 3 },
          { name: 'Video Ad', width: 1280, height: 720, ratio: '16:9', type: 'video', device: 'all', maxFileSizeMB: 1024 },
        ],
      },
    ],
  },
  {
    id: 'programmatic',
    platform: 'Programático & OOH Digital',
    emoji: '🖥️',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    formats: [
      {
        category: 'IAB Standard (Cross-Network)',
        items: [
          { name: 'Full Page Flex', width: 300, height: 1050, ratio: '2:7', type: 'image', device: 'desktop', maxFileSizeMB: 0.2 },
          { name: 'IAB Pushdown', width: 970, height: 415, ratio: '2.34:1', type: 'image', device: 'desktop', maxFileSizeMB: 0.2 },
          { name: 'IAB Rising Star', width: 320, height: 480, ratio: '2:3', type: 'image', device: 'mobile', maxFileSizeMB: 0.2 },
        ],
      },
      {
        category: 'OOH Digital (DOOH)',
        items: [
          { name: 'Digital Billboard (Landscape)', width: 1920, height: 1080, ratio: '16:9', type: 'both', device: 'all', recommended: true, maxFileSizeMB: 50, notes: 'Outdoors digitais — 3-10 segundos de exibição' },
          { name: 'Digital Billboard (Portrait)', width: 1080, height: 1920, ratio: '9:16', type: 'both', device: 'all', maxFileSizeMB: 50, notes: 'Totem, metrô, aeroporto' },
          { name: 'Retail Digital (Square)', width: 1080, height: 1080, ratio: '1:1', type: 'both', device: 'all', maxFileSizeMB: 50 },
        ],
      },
    ],
  },
];

// ─── FormatCard ────────────────────────────────────────────────────────────────

function FormatCard({ format, accentColor }: { format: FormatSpec; accentColor: string }) {
  const [copied, setCopied] = useState(false);
  const spec = `${format.width} × ${format.height} px`;
  const MAX_PREVIEW_W = 120;
  const MAX_PREVIEW_H = 80;
  const scale = Math.min(MAX_PREVIEW_W / format.width, MAX_PREVIEW_H / format.height, 1);
  const previewW = Math.round(format.width * scale);
  const previewH = Math.round(format.height * scale);
  const clampedW = Math.max(previewW, 8);
  const clampedH = Math.max(previewH, 8);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${format.width}x${format.height}px — ${format.ratio} — ${format.name}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const deviceIcon = format.device === 'desktop' ? '🖥️' : format.device === 'mobile' ? '📱' : '📱🖥️';
  const typeLabel = format.type === 'image' ? 'IMG' : format.type === 'video' ? 'VID' : 'IMG+VID';
  const typeColor = format.type === 'image' ? 'bg-blue-500/15 text-blue-300' : format.type === 'video' ? 'bg-purple-500/15 text-purple-300' : 'bg-teal-500/15 text-teal-300';

  return (
    <div className={cn(
      'group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg',
      format.recommended
        ? 'border-primary/40 bg-primary/5 shadow-sm'
        : 'border-border bg-card/50'
    )}>
      {format.recommended && (
        <div className="absolute -top-2 right-3">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">⭐ Recomendado</span>
        </div>
      )}

      {/* Visual Preview */}
      <div className="flex items-center justify-center h-[88px] bg-muted/30 rounded-lg">
        <div
          style={{ width: clampedW, height: clampedH }}
          className={cn(
            'rounded flex items-center justify-center text-[8px] font-bold transition-all',
            format.recommended ? 'bg-primary/30 border-2 border-primary/60' : 'bg-muted/60 border border-border'
          )}
        >
          <span className="text-muted-foreground/60" style={{ fontSize: Math.max(6, Math.min(9, clampedH / 4)) }}>
            {format.ratio}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-tight">{format.name}</p>
          <button onClick={handleCopy} className="shrink-0 rounded p-1 hover:bg-muted/50 transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>

        <p className="text-xs font-mono text-primary">{spec}</p>

        <div className="flex flex-wrap gap-1">
          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', typeColor)}>{typeLabel}</span>
          <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">{deviceIcon}</span>
          <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">{format.ratio}</span>
          {format.maxFileSizeMB && (
            <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {format.maxFileSizeMB >= 1 ? `${format.maxFileSizeMB}MB` : `${Math.round(format.maxFileSizeMB * 1000)}KB`} max
            </span>
          )}
        </div>

        {format.notes && (
          <p className="text-[10px] text-muted-foreground leading-snug border-t border-border/50 pt-1.5 mt-0.5">{format.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── PlatformTab ──────────────────────────────────────────────────────────────

function PlatformSection({ platform, search }: { platform: PlatformSection; search: string }) {
  const filtered = platform.formats.map(cat => ({
    ...cat,
    items: cat.items.filter(f =>
      search === '' ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.ratio.toLowerCase().includes(search.toLowerCase()) ||
      `${f.width}x${f.height}`.includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  if (filtered.length === 0) return (
    <div className="py-12 text-center text-muted-foreground">
      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p>Nenhum formato encontrado para "{search}"</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {filtered.map(cat => (
        <div key={cat.category}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-foreground">{cat.category}</h3>
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground">{cat.items.length} formatos</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {cat.items.map(format => (
              <FormatCard key={`${format.width}x${format.height}-${format.name}`} format={format} accentColor={platform.color} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats Banner ─────────────────────────────────────────────────────────────

function StatsBanner() {
  const totalFormats = PLATFORMS.reduce((acc, p) => acc + p.formats.reduce((a, c) => a + c.items.length, 0), 0);
  const recommended = PLATFORMS.reduce((acc, p) => acc + p.formats.reduce((a, c) => a + c.items.filter(i => i.recommended).length, 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Formatos Totais', value: totalFormats, icon: '📐' },
        { label: 'Recomendados', value: recommended, icon: '⭐' },
        { label: 'Plataformas', value: PLATFORMS.length, icon: '🌐' },
        { label: 'Canais de Mídia', value: 'Pago + Orgânico', icon: '📡' },
      ].map(stat => (
        <div key={stat.label} className="rounded-xl border border-border bg-card/50 p-3 flex items-center gap-3">
          <span className="text-2xl">{stat.icon}</span>
          <div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Formatos() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('instagram');

  const handleExportGuide = () => {
    const lines: string[] = ['GUIA DE FORMATOS CRIATIVOS — DQEF HUB', '='.repeat(50), ''];
    PLATFORMS.forEach(p => {
      lines.push(`\n## ${p.platform.toUpperCase()}`);
      p.formats.forEach(cat => {
        lines.push(`\n### ${cat.category}`);
        cat.items.forEach(f => {
          lines.push(`- ${f.name}: ${f.width}×${f.height}px (${f.ratio})${f.recommended ? ' ★' : ''}${f.notes ? ` — ${f.notes}` : ''}`);
        });
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DQEF-Formatos-Criativos.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📐</span>
              <h1 className="text-xl font-bold text-foreground">Formatos Criativos</h1>
              <Badge variant="outline" className="border-primary/40 text-primary text-xs">Atualizado 2025</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Guia completo de dimensões para todos os canais — orgânico, pago e display
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar formato..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportGuide} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Exportar Guia
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        <StatsBanner />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6 bg-muted/30 p-1 rounded-xl">
            {PLATFORMS.map(p => (
              <TabsTrigger
                key={p.id}
                value={p.id}
                className={cn(
                  'gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm'
                )}
              >
                <span>{p.emoji}</span>
                <span className="hidden sm:inline">{p.platform}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {PLATFORMS.map(p => (
            <TabsContent key={p.id} value={p.id} className="mt-0">
              {/* Platform Header */}
              <div className={cn('rounded-xl border p-4 mb-6', p.bgColor, p.borderColor)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.emoji}</span>
                    <div>
                      <h2 className={cn('text-lg font-bold', p.color)}>{p.platform}</h2>
                      <p className="text-sm text-muted-foreground">
                        {p.formats.reduce((a, c) => a + c.items.length, 0)} formatos ·{' '}
                        {p.formats.reduce((a, c) => a + c.items.filter(i => i.recommended).length, 0)} recomendados
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={cn('border', p.borderColor, p.color)}>
                      {p.formats.length} categorias
                    </Badge>
                  </div>
                </div>
              </div>

              <PlatformSection platform={p} search={search} />
            </TabsContent>
          ))}
        </Tabs>

        {/* Footer Legend */}
        <div className="mt-8 rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">📖 Legenda</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><span className="rounded bg-accent/30 text-foreground px-1.5 py-0.5 font-medium">IMG</span> Somente imagem</div>
            <div className="flex items-center gap-2"><span className="rounded bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 font-medium">VID</span> Somente vídeo</div>
            <div className="flex items-center gap-2"><span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 font-medium">IMG+VID</span> Imagem ou vídeo</div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">⭐ Recomendado</span> Maior alcance</div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 border-t border-border/50 pt-3">
            Fontes: Google Ad Manager, Meta Business, TikTok for Business, LinkedIn Marketing Solutions, Pinterest Ads Manager, IAB Standards. Atualizado em fevereiro 2026.
          </p>
        </div>
      </div>
    </div>
  );
}
