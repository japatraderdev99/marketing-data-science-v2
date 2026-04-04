import { Slider } from '@/components/ui/slider';

interface AdjProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: string;
  className?: string;
}

export default function AdjSlider({ label, value, min, max, step, display, className, ...rest }: AdjProps & { onValueChange: (v: number) => void }) {
  const formatted = display ?? (value >= 1 && max <= 10
    ? `${value.toFixed(1)}×`
    : `${Math.round(value * 100)}%`);

  return (
    <div className={className}>
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-mono text-primary">{formatted}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => rest.onValueChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
