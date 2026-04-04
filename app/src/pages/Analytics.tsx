import { useState } from 'react';
import {
  BarChart3, Sparkles, Settings2, Globe,
  DollarSign, Target, Megaphone, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import OperacionalTab from '@/components/analytics/OperacionalTab';
import SaudeFinanceiraTab from '@/components/analytics/SaudeFinanceiraTab';
import FunilE2ETab from '@/components/analytics/FunilE2ETab';
import GA4Tab from '@/components/analytics/GA4Tab';
import MetaAdsTab from '@/components/analytics/MetaAdsTab';
import RelatorioCMOTab from '@/components/analytics/RelatorioCMOTab';

type Period = '7d' | '30d' | '90d';
type TabId = 'operacional' | 'financeiro' | 'funil' | 'ga4' | 'meta-ads' | 'cmo-reports';

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'operacional', label: 'Operacional', icon: Settings2 },
  { id: 'financeiro', label: 'Saúde Financeira', icon: DollarSign },
  { id: 'funil', label: 'Funil E2E', icon: Target },
  { id: 'ga4', label: 'GA4', icon: Globe },
  { id: 'meta-ads', label: 'Meta Ads', icon: Megaphone },
  { id: 'cmo-reports', label: 'Relatórios CMO', icon: FileText },
];

export default function Analytics() {
  const [tab, setTab] = useState<TabId>('operacional');
  const [period, setPeriod] = useState<Period>('30d');

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand" />
          <div>
            <h1 className="font-heading font-black text-xl uppercase text-text-primary">Analytics</h1>
            <p className="text-sm text-text-secondary">Performance e métricas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-white text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            Diagnóstico IA
          </button>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  period === p
                    ? 'bg-brand text-white'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary',
                )}
              >
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-text-muted">Inteligência de Marketing — DQEF Hub</p>

      {/* Tab Navigation */}
      <div className="flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors',
              tab === id
                ? 'bg-brand/15 text-brand border border-brand/30'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'operacional' && <OperacionalTab period={period} />}
      {tab === 'financeiro' && <SaudeFinanceiraTab />}
      {tab === 'funil' && <FunilE2ETab />}
      {tab === 'ga4' && <GA4Tab />}
      {tab === 'meta-ads' && <MetaAdsTab period={period} />}
      {tab === 'cmo-reports' && <RelatorioCMOTab />}
    </div>
  );
}
