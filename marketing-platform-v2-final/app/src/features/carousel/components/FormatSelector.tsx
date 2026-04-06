import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CreativeFormatDef {
  id: string;
  platform: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
  icon?: string;
}

const FORMATS: { platform: string; icon: string; items: CreativeFormatDef[] }[] = [
  {
    platform: 'Instagram', icon: '📸',
    items: [
      { id: 'ig-stories', platform: 'Instagram', label: 'Stories/Reels', width: 1080, height: 1920, ratio: '9:16' },
      { id: 'ig-feed-45', platform: 'Instagram', label: 'Feed 4:5', width: 1080, height: 1350, ratio: '4:5' },
      { id: 'ig-feed-34', platform: 'Instagram', label: 'Feed 3:4', width: 1080, height: 1440, ratio: '3:4' },
      { id: 'ig-feed-11', platform: 'Instagram', label: 'Feed 1:1', width: 1080, height: 1080, ratio: '1:1' },
      { id: 'ig-landscape', platform: 'Instagram', label: 'Paisagem', width: 1080, height: 566, ratio: '1.91:1' },
    ],
  },
  {
    platform: 'TikTok', icon: '🎵',
    items: [
      { id: 'tt-vertical', platform: 'TikTok', label: 'TikTok Vertical', width: 1080, height: 1920, ratio: '9:16' },
      { id: 'tt-square', platform: 'TikTok', label: 'TikTok Quadrado', width: 1080, height: 1080, ratio: '1:1' },
    ],
  },
  {
    platform: 'Facebook', icon: '👥',
    items: [
      { id: 'fb-feed', platform: 'Facebook', label: 'Facebook Feed', width: 1200, height: 1200, ratio: '1:1' },
      { id: 'fb-stories', platform: 'Facebook', label: 'Facebook Stories', width: 1080, height: 1920, ratio: '9:16' },
    ],
  },
  {
    platform: 'LinkedIn', icon: '💼',
    items: [
      { id: 'li-feed', platform: 'LinkedIn', label: 'LinkedIn Feed', width: 1200, height: 1200, ratio: '1:1' },
      { id: 'li-landscape', platform: 'LinkedIn', label: 'LinkedIn Landscape', width: 1200, height: 627, ratio: '1.91:1' },
    ],
  },
  {
    platform: 'Google Display', icon: '📊',
    items: [
      { id: 'gd-medium-rect', platform: 'Google Display', label: 'Medium Rectangle', width: 300, height: 250, ratio: '6:5' },
      { id: 'gd-leaderboard', platform: 'Google Display', label: 'Leaderboard', width: 728, height: 90, ratio: '8:1' },
      { id: 'gd-half-page', platform: 'Google Display', label: 'Half Page', width: 300, height: 600, ratio: '1:2' },
      { id: 'gd-responsive', platform: 'Google Display', label: 'Responsivo 1:8:1', width: 1200, height: 628, ratio: '1.91:1' },
    ],
  },
  {
    platform: 'YouTube', icon: '▶️',
    items: [
      { id: 'yt-thumbnail', platform: 'YouTube', label: 'YT Thumbnail', width: 1280, height: 720, ratio: '16:9' },
      { id: 'yt-shorts', platform: 'YouTube', label: 'YouTube Shorts', width: 1080, height: 1920, ratio: '9:16' },
    ],
  },
];

export const DEFAULT_FORMAT = FORMATS[0].items[1]; // Instagram Feed 4:5

interface FormatSelectorProps {
  value: CreativeFormatDef;
  onChange: (format: CreativeFormatDef) => void;
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      {/* Selected format pill */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all',
          open ? 'border-brand bg-brand/5' : 'border-border hover:border-text-muted',
        )}
      >
        <div className="text-left">
          <div className="text-xs font-bold text-text-primary">
            {value.platform} · {value.label}
          </div>
          <div className="text-[10px] text-text-muted">
            {value.width}×{value.height}px · {value.ratio}
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown grid */}
      {open && (
        <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-3 shadow-xl">
          {FORMATS.map((group) => (
            <div key={group.platform}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                {group.icon} {group.platform}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => { onChange(fmt); setOpen(false); }}
                    className={cn(
                      'px-2 py-1.5 rounded-md border text-left transition-all',
                      value.id === fmt.id
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-text-muted hover:border-text-muted hover:text-text-primary',
                    )}
                  >
                    <div className="text-[11px] font-medium">{fmt.label}</div>
                    <div className="text-[9px] opacity-60">{fmt.width}×{fmt.height}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
