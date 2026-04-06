import { MediaLibrary } from '@/features/media/MediaLibrary';

export default function Biblioteca() {
  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0">
        <h1 className="font-heading font-black text-sm uppercase tracking-wider text-text-primary">
          Biblioteca de Mídia
        </h1>
      </div>
      <div className="flex-1 overflow-hidden p-6">
        <MediaLibrary />
      </div>
    </div>
  );
}
