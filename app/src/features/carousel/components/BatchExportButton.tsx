import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Loader2 } from 'lucide-react';
import type { SlideOutput, CarouselTheme, SlideSettings } from '@/types';
import { DEFAULT_SLIDE_SETTINGS } from '@/types';
import { SlidePreview } from './SlidePreview';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

interface BatchExportProps {
  slides: SlideOutput[];
  theme: CarouselTheme;
  title: string;
  settingsMap?: Record<number, SlideSettings>;
  slideImages?: Record<number, string>;
}

export function BatchExportButton({ slides, theme, title, settingsMap, slideImages }: BatchExportProps) {
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    setExporting(true);
    const zip = new JSZip();

    try {
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;';
      document.body.appendChild(container);

      for (const slide of slides) {
        const slideContainer = document.createElement('div');
        container.appendChild(slideContainer);

        const root = createRoot(slideContainer);
        flushSync(() => {
          root.render(
            <SlidePreview
              slide={slide}
              theme={theme}
              width={1080}
              height={1350}
              showWatermark
              imageUrl={slideImages?.[slide.number]}
              settings={settingsMap?.[slide.number] || DEFAULT_SLIDE_SETTINGS}
              isExport
            />,
          );
        });

        await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 100));

        const dataUrl = await toPng(slideContainer.firstElementChild as HTMLElement, {
          width: 1080,
          height: 1350,
          pixelRatio: 1,
        });

        const base64 = dataUrl.split(',')[1];
        zip.file(`${slide.number}-${slide.type}.png`, base64, { base64: true });

        root.unmount();
        slideContainer.remove();
      }

      document.body.removeChild(container);

      const blob = await zip.generateAsync({ type: 'blob' });
      const safeName = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      saveAs(blob, `${safeName}_carrossel.zip`);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {exporting ? 'Exportando...' : 'Exportar ZIP'}
      </button>
      <div ref={containerRef} className="hidden" />
    </>
  );
}
