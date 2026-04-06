import { useState } from 'react';
import { Plus, Loader2, Megaphone, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  type Campaign,
  type CampaignInput,
  type CampaignStatus,
} from '../hooks/useCampaigns';
import { CampaignCard } from './CampaignCard';
import { CampaignForm } from './CampaignForm';

const STATUS_FILTERS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'ended', label: 'Encerradas' },
];

export function CampaignList() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = campaigns.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreate = async (input: CampaignInput) => {
    await createCampaign.mutateAsync(input);
    setShowForm(false);
  };

  const handleUpdate = async (input: CampaignInput) => {
    if (!editing) return;
    await updateCampaign.mutateAsync({ id: editing.id, input });
    setEditing(null);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setShowForm(false);
  };

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar campanha..."
            className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand outline-none transition-colors"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-bold transition-colors',
                statusFilter === f.value
                  ? 'bg-brand text-white'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* New campaign */}
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-brand text-white text-sm font-bold shrink-0"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center opacity-30">
            <Megaphone className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="font-heading font-bold text-base text-text-primary">Nenhuma campanha ainda</h3>
            <p className="text-sm text-text-muted mt-1 max-w-sm">
              Crie sua primeira campanha para organizar criativos e injetar contexto nos prompts de IA.
            </p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-brand text-white text-sm font-bold">
            <Plus className="w-4 h-4" /> Criar primeira campanha
          </button>
        </div>
      )}

      {!isLoading && campaigns.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-text-muted">Nenhuma campanha encontrada para os filtros selecionados.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEdit}
              onDelete={id => deleteCampaign.mutate(id)}
              deleting={deleteCampaign.isPending}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {(showForm || editing) && (
        <CampaignForm
          editing={editing}
          onClose={closeForm}
          onSubmit={editing ? handleUpdate : handleCreate}
          isPending={createCampaign.isPending || updateCampaign.isPending}
        />
      )}
    </>
  );
}
