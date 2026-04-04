import { ANGLES } from '../constants';
import { cn } from '@/lib/utils';

interface AngleSelectorProps {
  value: string;
  onChange: (angle: string) => void;
}

export function AngleSelector({ value, onChange }: AngleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
        Ângulo Emocional
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {ANGLES.map((angle) => (
          <button
            key={angle.id}
            onClick={() => onChange(angle.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all',
              value === angle.id
                ? `${angle.color} bg-white/5 border-current`
                : 'border-border text-text-muted hover:border-text-muted hover:text-text-secondary',
            )}
          >
            <span className="text-sm">{angle.emoji}</span>
            <span>{angle.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
