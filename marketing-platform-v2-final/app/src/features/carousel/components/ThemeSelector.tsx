import { CAROUSEL_THEMES } from '../constants';
import type { CarouselThemeId } from '@/types';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  value: CarouselThemeId;
  onChange: (theme: CarouselThemeId) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
        Tema Visual
      </label>
      <div className="flex gap-2">
        {CAROUSEL_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={cn(
              'flex-1 p-2.5 rounded-lg border transition-all text-left',
              value === theme.id
                ? 'border-brand bg-brand/10'
                : 'border-border hover:border-text-muted',
            )}
          >
            <div className="flex gap-1 mb-1.5">
              {theme.previewSwatch.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-white/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-text-primary">{theme.label}</span>
            <p className="text-[10px] text-text-muted">{theme.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
