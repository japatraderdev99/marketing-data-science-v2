import { Palette } from 'lucide-react';
import { AssetsSection } from '@/features/brand-kit/components/AssetsSection';
import { ColorsSection } from '@/features/brand-kit/components/ColorsSection';
import { FontsSection } from '@/features/brand-kit/components/FontsSection';

export default function BrandKit() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Palette className="w-5 h-5 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Brand Kit</h1>
          <p className="text-sm text-text-secondary">Identidade visual da marca — logos, cores e tipografia</p>
        </div>
      </div>

      <AssetsSection />
      <ColorsSection />
      <FontsSection />
    </div>
  );
}
