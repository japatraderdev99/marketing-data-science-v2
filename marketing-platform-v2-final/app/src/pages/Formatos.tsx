import { useState } from 'react';
import { Ruler, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Format {
  name: string;
  width: number;
  height: number;
  ratio: string;
  use: string;
  platform: string;
}

const FORMATS: Format[] = [
  // Instagram
  { name: 'Instagram Feed 4:5', width: 1080, height: 1350, ratio: '4:5', use: 'Feed principal — máximo alcance', platform: 'Instagram' },
  { name: 'Instagram Feed 3:4', width: 1080, height: 1440, ratio: '3:4', use: 'Feed — mais altura', platform: 'Instagram' },
  { name: 'Instagram Quadrado', width: 1080, height: 1080, ratio: '1:1', use: 'Feed clássico', platform: 'Instagram' },
  { name: 'Instagram Stories', width: 1080, height: 1920, ratio: '9:16', use: 'Stories e Reels', platform: 'Instagram' },
  { name: 'Instagram Paisagem', width: 1080, height: 566, ratio: '1.91:1', use: 'Feed horizontal', platform: 'Instagram' },
  // TikTok
  { name: 'TikTok Vertical', width: 1080, height: 1920, ratio: '9:16', use: 'Vídeos e imagens TikTok', platform: 'TikTok' },
  { name: 'TikTok Quadrado', width: 1080, height: 1080, ratio: '1:1', use: 'Alternativa quadrada', platform: 'TikTok' },
  // Facebook
  { name: 'Facebook Feed', width: 1200, height: 630, ratio: '1.91:1', use: 'Feed e link preview', platform: 'Facebook' },
  { name: 'Facebook Quadrado', width: 1200, height: 1200, ratio: '1:1', use: 'Feed quadrado', platform: 'Facebook' },
  { name: 'Facebook Stories', width: 1080, height: 1920, ratio: '9:16', use: 'Stories Facebook', platform: 'Facebook' },
  // LinkedIn
  { name: 'LinkedIn Post', width: 1200, height: 627, ratio: '1.91:1', use: 'Post e link preview', platform: 'LinkedIn' },
  { name: 'LinkedIn Quadrado', width: 1080, height: 1080, ratio: '1:1', use: 'Post quadrado', platform: 'LinkedIn' },
  { name: 'LinkedIn Vertical', width: 1080, height: 1350, ratio: '4:5', use: 'Post vertical destaque', platform: 'LinkedIn' },
  // Google Display
  { name: 'Google Leaderboard', width: 728, height: 90, ratio: '8:1', use: 'Banner topo', platform: 'Google Display' },
  { name: 'Google Rectangle', width: 300, height: 250, ratio: '6:5', use: 'Medium rectangle — mais usado', platform: 'Google Display' },
  { name: 'Google Half Page', width: 300, height: 600, ratio: '1:2', use: 'Half page / filmstrip', platform: 'Google Display' },
];

const PLATFORMS = ['Todos', 'Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Google Display'];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-500/10 text-pink-400',
  TikTok: 'bg-cyan-500/10 text-cyan-400',
  Facebook: 'bg-blue-500/10 text-blue-400',
  LinkedIn: 'bg-sky-500/10 text-sky-400',
  'Google Display': 'bg-yellow-500/10 text-yellow-500',
};

export default function Formatos() {
  const [active, setActive] = useState('Todos');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = active === 'Todos' ? FORMATS : FORMATS.filter(f => f.platform === active);

  const copyDimensions = (f: Format) => {
    navigator.clipboard.writeText(`${f.width}x${f.height}`);
    setCopied(f.name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Ruler className="w-5 h-5 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Formatos</h1>
          <p className="text-sm text-text-secondary">Dimensões e especificações por plataforma</p>
        </div>
      </div>

      {/* Platform filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setActive(p)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-bold transition-colors',
              active === p ? 'gradient-brand text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(f => {
          const maxDim = 80;
          const isPortrait = f.height > f.width;
          const isSquare = f.height === f.width;
          const previewW = isPortrait ? Math.round(maxDim * (f.width / f.height)) : maxDim;
          const previewH = isPortrait ? maxDim : isSquare ? maxDim : Math.round(maxDim * (f.height / f.width));

          return (
            <div key={f.name} className="group bg-surface-elevated border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-brand/30 transition-colors">
              {/* Visual preview */}
              <div className="flex items-center justify-center h-24">
                <div
                  className="border-2 border-brand/40 rounded bg-brand/5 flex items-center justify-center"
                  style={{ width: previewW, height: previewH }}
                >
                  <span className="text-[9px] font-bold text-brand/50">{f.ratio}</span>
                </div>
              </div>

              {/* Info */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-heading font-bold text-xs text-text-primary leading-tight">{f.name}</p>
                  <span className={cn('shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded', PLATFORM_COLORS[f.platform])}>
                    {f.platform === 'Google Display' ? 'Google' : f.platform}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mb-2">{f.use}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-text-secondary font-bold">{f.width} × {f.height}</span>
                  <button
                    onClick={() => copyDimensions(f)}
                    className="flex items-center gap-1 text-[10px] text-text-muted hover:text-brand transition-colors"
                  >
                    {copied === f.name ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied === f.name ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-muted text-center pb-4">
        {filtered.length} formatos — clique em "Copiar" para copiar as dimensões
      </p>
    </div>
  );
}
