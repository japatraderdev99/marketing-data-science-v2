import { cn } from '@/lib/utils';

interface AdjSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: string;
  className?: string;
  onValueChange: (v: number) => void;
}

export function AdjSlider({ label, value, min, max, step, display, className, onValueChange }: AdjSliderProps) {
  const formatted = display ?? (value >= 1 && max <= 10
    ? `${value.toFixed(1)}×`
    : `${Math.round(value * 100)}%`);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-mono text-brand">{formatted}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 bg-surface-hover rounded-full appearance-none cursor-pointer accent-brand
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
      />
    </div>
  );
}
