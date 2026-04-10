import { useRef, useState } from 'react';
import { Sparkles, Upload, Images, Trash2, Loader2, AlertCircle, Wand2, BookmarkPlus, Check } from 'lucide-react';
import { useSlideImage } from '../hooks/useSlideImage';
import { MediaPickerModal } from '@/features/criativo/components/MediaPickerModal';
import { useAddToLibrary } from '@/features/media/hooks/useAddToLibrary';
import { cn } from '@/lib/utils';

const QUICK_TAGS = [
  'luz dourada', 'ângulo de baixo', 'preto e branco',
  'close no rosto', 'ambiente noturno', 'retroiluminado',
];

interface SlideImageControlsProps {
  slideNumber: number;
  imagePromptSuggestion?: string;
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  slideContext?: { headline?: string; slideType?: string; topic?: string };
}

export function SlideImageControls({
  slideNumber,
  imagePromptSuggestion = '',
  currentImageUrl,
  onImageChange,
  slideContext,
}: SlideImageControlsProps) {
  const [prompt, setPrompt] = useState(imagePromptSuggestion);
  const [showPicker, setShowPicker] = useState(false);
  const [savedToLib, setSavedToLib] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isGenerating, isUploading, error, generate, upload, clearError } = useSlideImage();
  const addToLibrary = useAddToLibrary();

  const handleSaveToLibrary = async () => {
    if (!currentImageUrl) return;
    setSavedToLib(false);
    await addToLibrary.mutateAsync({ imageUrl: currentImageUrl, context: slideContext });
    setSavedToLib(true);
    setTimeout(() => setSavedToLib(false), 3000);
  };

  const handleGenerate = async () => {
    clearError();
    const url = await generate({ prompt: prompt || imagePromptSuggestion, translateFirst: true });
    if (url) onImageChange(url);
  };

  const handleAddTag = (tag: string) => {
    setPrompt(prev => prev ? `${prev}, ${tag}` : tag);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await upload(file);
    if (dataUrl) onImageChange(dataUrl);
    e.target.value = '';
  };

  return (
    <div className="space-y-2.5 p-3 bg-surface-elevated rounded-lg border border-border">
      {/* Section header */}
      <div className="flex items-center gap-1.5">
        <Wand2 className="w-3 h-3 text-brand" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Imagem de Fundo — Lâmina {slideNumber}
        </span>
      </div>

      {/* Prompt input */}
      <div className="space-y-1">
        <label className="text-[10px] text-text-muted font-medium">
          PROMPT PERSONALIZADO (PT→EN)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={imagePromptSuggestion || 'Descreva a imagem em português. Ex: "Eletricista sorrindo em obra, luz natural"'}
          className="w-full bg-surface-hover border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted resize-none focus:border-brand outline-none"
          rows={2}
        />
      </div>

      {/* Quick tags */}
      <div className="space-y-1">
        <span className="text-[10px] text-text-muted">Ajuste rápido:</span>
        <div className="flex flex-wrap gap-1">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleAddTag(tag)}
              className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-[10px] text-text-muted hover:border-brand hover:text-brand transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            'col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all',
            isGenerating
              ? 'bg-brand/20 text-brand/60 cursor-wait'
              : 'bg-brand hover:bg-brand-dark text-white',
          )}
        >
          {isGenerating
            ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando imagem...</>
            : <><Sparkles className="w-3 h-3" />Traduzir e Gerar Imagem</>}
        </button>

        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-border text-xs text-text-secondary hover:text-brand hover:border-brand/50 transition-colors"
        >
          <Images className="w-3 h-3" />
          Trocar imagem
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-border text-xs text-text-secondary hover:text-brand hover:border-brand/50 transition-colors disabled:opacity-50"
        >
          {isUploading
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Upload className="w-3 h-3" />}
          Inserir do dispositivo
        </button>

        {currentImageUrl && (
          <>
            <button
              onClick={handleSaveToLibrary}
              disabled={addToLibrary.isPending || savedToLib}
              className={cn(
                'col-span-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all',
                savedToLib
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : 'border-brand/40 text-brand hover:bg-brand/10 disabled:opacity-50',
              )}
            >
              {addToLibrary.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : savedToLib
                  ? <Check className="w-3 h-3" />
                  : <BookmarkPlus className="w-3 h-3" />}
              {savedToLib ? 'Salvo na biblioteca!' : 'Salvar na biblioteca (sem texto)'}
            </button>
            <button
              onClick={() => onImageChange(null)}
              className="col-span-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Tirar imagem
            </button>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {showPicker && (
        <MediaPickerModal
          currentUrl={currentImageUrl}
          context={slideContext}
          onSelect={(url) => { onImageChange(url); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
