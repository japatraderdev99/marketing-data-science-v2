import { Megaphone } from 'lucide-react';
import { CampaignList } from '@/features/campaigns/components/CampaignList';

export default function Campanhas() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="w-5 h-5 text-brand" />
        <div>
          <h1 className="font-heading font-black text-xl uppercase text-text-primary">Campanhas</h1>
          <p className="text-sm text-text-secondary">Organize suas campanhas e injete contexto nos criativos de IA</p>
        </div>
      </div>

      <CampaignList />
    </div>
  );
}
